import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { calcBookingTotals } from "@/lib/money";
import type { VanListing, HostProfile, UserPaymentProfile } from "@/lib/types";

const schema = z.object({
  listingId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestCount: z.number().int().min(1).max(20),
  selectedAddonIds: z.array(z.string()).optional().default([]),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function parseDateToMs(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { listingId, startDate, endDate, guestCount, selectedAddonIds } = parsed.data;
  const startMs = parseDateToMs(startDate);
  const endMs   = parseDateToMs(endDate);
  if (endMs <= startMs) return bad("End date must be after start date");
  const nights = Math.round((endMs - startMs) / 86400000);

  const listing = await db()
    .prepare("SELECT * FROM van_listing WHERE id = ? AND status = 'published'")
    .bind(listingId)
    .first<VanListing>();
  if (!listing) return bad("Listing not found or not available", 404);
  if (listing.hostUserId === session.user.id) return bad("You cannot book your own listing");
  if (nights < listing.minimumNights)
    return bad(`Minimum stay is ${listing.minimumNights} night${listing.minimumNights !== 1 ? "s" : ""}`);

  const block = await db()
    .prepare(
      `SELECT 1 FROM user_block
       WHERE (blockerUserId = ? AND blockedUserId = ?)
          OR (blockerUserId = ? AND blockedUserId = ?)`
    )
    .bind(session.user.id, listing.hostUserId, listing.hostUserId, session.user.id)
    .first();
  if (block) return bad("This booking is not available", 403);

  const overlap = await db()
    .prepare(
      `SELECT COUNT(*) AS cnt FROM availability_block
       WHERE vanListingId = ? AND startDate <= ? AND endDate >= ?`
    )
    .bind(listingId, endMs, startMs)
    .first<{ cnt: number }>();
  if ((overlap?.cnt ?? 0) > 0) return bad("Those dates are not available", 409);

  // KYC guard — all guests must be verified before booking
  const guestUser = await db()
    .prepare("SELECT kycStatus, dateOfBirth FROM user WHERE id = ?")
    .bind(session.user.id)
    .first<{ kycStatus: string; dateOfBirth: number | null }>();
  if (!guestUser || guestUser.kycStatus !== "verified") {
    return bad("Identity verification required before booking. Go to your profile to verify.", 403);
  }
  // Age guard
  if (listing.minDriverAge > 18) {
    if (!guestUser.dateOfBirth) {
      return bad(`This van requires drivers aged ${listing.minDriverAge}+. Please re-verify your identity to confirm your age.`, 403);
    }
    const ageYears = (Date.now() / 1000 - guestUser.dateOfBirth) / (365.25 * 24 * 3600);
    if (ageYears < listing.minDriverAge) {
      return bad(`This van requires drivers aged ${listing.minDriverAge}+.`, 403);
    }
  }

  // Require host to have completed Stripe Connect onboarding
  const hp = await db()
    .prepare("SELECT stripeAccountId, stripeOnboardingCompleted FROM host_profile WHERE userId = ?")
    .bind(listing.hostUserId)
    .first<Pick<HostProfile, "stripeAccountId"> & { stripeOnboardingCompleted: number }>();

  if (!hp?.stripeAccountId || !hp.stripeOnboardingCompleted) {
    return bad("This host has not yet set up their payment account. Please contact the host or try another listing.");
  }

  // Resolve selected add-ons and compute their total
  const uniqueAddonIds = Array.from(new Set(selectedAddonIds)).sort();
  if (uniqueAddonIds.length !== selectedAddonIds.length) {
    return bad("Invalid add-on selection");
  }

  let addonTotalCents = 0;
  let resolvedAddons: Array<{ addonId: string; name: string; priceNZDCents: number }> = [];
  if (uniqueAddonIds.length > 0) {
    const rows = await db()
      .prepare(
        `SELECT la.addonId, a.name, la.priceNZDCents
         FROM listing_addon la
         JOIN addon a ON a.id = la.addonId
         WHERE la.vanListingId = ?`
      )
      .bind(listingId)
      .all<{ addonId: string; name: string; priceNZDCents: number }>();
    const available = new Map(rows.results.map((r) => [r.addonId, r]));
    resolvedAddons = uniqueAddonIds
      .map((aid) => available.get(aid))
      .filter((r): r is { addonId: string; name: string; priceNZDCents: number } => !!r);
    if (resolvedAddons.length !== uniqueAddonIds.length) {
      return bad("Invalid add-on selection");
    }
    addonTotalCents = resolvedAddons.reduce((sum, r) => sum + r.priceNZDCents, 0);
  }

  const totals = calcBookingTotals(listing.nightlyRate, nights, addonTotalCents);

  // Get or create Stripe Customer for this guest
  let stripeCustomerId: string;
  const existingProfile = await db()
    .prepare("SELECT stripeCustomerId FROM user_payment_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<UserPaymentProfile>();

  if (existingProfile) {
    stripeCustomerId = existingProfile.stripeCustomerId;
  } else {
    const s = await stripe();
    const customer = await s.customers.create({
      email: session.user.email,
      name: session.user.name ?? undefined,
      metadata: { userId: session.user.id },
    });
    stripeCustomerId = customer.id;
    const nowSec = Math.floor(Date.now() / 1000);
    await db()
      .prepare("INSERT INTO user_payment_profile (userId, stripeCustomerId, createdAt) VALUES (?, ?, ?)")
      .bind(session.user.id, stripeCustomerId, nowSec)
      .run();
  }

  const s = await stripe();
  const pi = await s.paymentIntents.create({
    amount: totals.totalCents,
    currency: "nzd",
    customer: stripeCustomerId,
    capture_method: "manual",
    setup_future_usage: "off_session",
    metadata: {
      listingId,
      startDate,
      endDate,
      guestCount: String(guestCount),
      userId: session.user.id,
      hostUserId: listing.hostUserId,
      addonIds: uniqueAddonIds.join(","),
    },
  });

  return NextResponse.json({
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    totals: {
      subtotalCents: totals.subtotalCents,
      serviceFeeCents: totals.serviceFeeCents,
      gstOnFeeCents: totals.gstOnFeeCents,
      addonTotalCents,
      totalCents: totals.totalCents,
      depositCents: totals.depositCents,
    },
    resolvedAddons,
  });
}

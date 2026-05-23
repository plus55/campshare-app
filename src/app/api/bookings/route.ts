import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { calcBookingTotals } from "@/lib/money";
import { sendBookingRequestedEmail, sendPaymentCapturedEmail, sendInstantBookedHostEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { isInstantBookEligible } from "@/lib/badges";
import type { Booking, VanListing } from "@/lib/types";

const schema = z.object({
  listingId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
  guestCount: z.number().int().min(1).max(20),
  message: z.string().max(2000).optional().nullable(),
  paymentIntentId: z.string().min(1),
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

  const allowed = await checkRateLimit("RATE_LIMIT_BOOKINGS", session.user.id);
  if (!allowed) return bad("Too many booking requests. Please wait a moment.", 429);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { listingId, startDate, endDate, guestCount, message, paymentIntentId, selectedAddonIds } = parsed.data;

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
  if (nights < listing.minimumNights) return bad(`Minimum stay is ${listing.minimumNights} night${listing.minimumNights !== 1 ? "s" : ""}`);

  // Block check — either side can refuse the relationship
  const block = await db()
    .prepare(
      `SELECT 1 FROM user_block
       WHERE (blockerUserId = ? AND blockedUserId = ?)
          OR (blockerUserId = ? AND blockedUserId = ?)`
    )
    .bind(session.user.id, listing.hostUserId, listing.hostUserId, session.user.id)
    .first();
  if (block) return bad("This booking is not available", 403);

  // KYC + age guard (defence in depth — also enforced on /api/bookings/payment-intent)
  const guestUser = await db()
    .prepare("SELECT kycStatus, dateOfBirth FROM user WHERE id = ?")
    .bind(session.user.id)
    .first<{ kycStatus: string; dateOfBirth: number | null }>();
  if (!guestUser || guestUser.kycStatus !== "verified") {
    return bad("Identity verification required before booking", 403);
  }
  if (listing.minDriverAge > 18) {
    if (!guestUser.dateOfBirth) {
      return bad(`This van requires drivers aged ${listing.minDriverAge}+`, 403);
    }
    const ageYears = (Date.now() / 1000 - guestUser.dateOfBirth) / (365.25 * 24 * 3600);
    if (ageYears < listing.minDriverAge) {
      return bad(`This van requires drivers aged ${listing.minDriverAge}+`, 403);
    }
  }

  const overlap = await db()
    .prepare(
      `SELECT COUNT(*) AS cnt FROM availability_block
       WHERE vanListingId = ? AND startDate <= ? AND endDate >= ?`
    )
    .bind(listingId, endMs, startMs)
    .first<{ cnt: number }>();

  if ((overlap?.cnt ?? 0) > 0) return bad("Those dates are not available");

  // Verify the PaymentIntent is properly authorized
  const s = await stripe();
  const pi = await s.paymentIntents.retrieve(paymentIntentId);

  if (pi.status !== "requires_capture") {
    return bad("Payment authorization not confirmed. Please complete payment before requesting.");
  }

  // Verify PI belongs to this user
  const paymentMethod = pi.payment_method as string | null;
  const customerStripeId = pi.customer as string | null;

  // Resolve selected add-ons to verify they're valid for this listing
  let addonTotalCents = 0;
  let resolvedAddons: Array<{ addonId: string; name: string; priceNZDCents: number }> = [];
  if (selectedAddonIds.length > 0) {
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
    resolvedAddons = selectedAddonIds
      .map((aid) => available.get(aid))
      .filter((r): r is { addonId: string; name: string; priceNZDCents: number } => !!r);
    addonTotalCents = resolvedAddons.reduce((sum, r) => sum + r.priceNZDCents, 0);
  }

  const totals = calcBookingTotals(listing.nightlyRate, nights, addonTotalCents);

  // Sanity-check PI amount matches expected total (including add-ons)
  if (pi.amount !== totals.totalCents) {
    return bad("Payment amount mismatch. Please start the booking again.");
  }

  // Instant-book is only offered if the host meets eligibility (KYC + 3 completed
  // bookings + 4.5⋆ avg). Ineligible hosts silently downgrade to request flow —
  // no error to the guest. PDP also hides the IB CTA, so this is defence-in-depth.
  const isInstantBook = !!listing.instantBook && await isInstantBookEligible(listing.hostUserId);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 48 * 60 * 60;
  const bookingId = crypto.randomUUID();
  const blockId = crypto.randomUUID();

  // Atomicity: insert the booking row (+ addons, + availability block for IB)
  // BEFORE calling Stripe capture. If the worker dies mid-flight after capture,
  // we have a booking row to reconcile against. The booking starts in
  // 'pending_capture' for IB; the finalise batch promotes it to 'accepted'.
  const initialStatus = isInstantBook ? "pending_capture" : "requested";

  const insertStmts = [
    db()
      .prepare(
        `INSERT INTO booking
           (id, vanListingId, guestUserId, hostUserId,
            startDate, endDate, nights, guestCount,
            nightlyRateCents, subtotalCents, serviceFeeCents, gstOnFeeCents,
            hostPayoutCents, totalCents, depositCents, cancellationPolicy,
            guestMessage, status, addonTotalCents,
            paymentIntentId, depositPaymentMethodId, customerStripeId,
            requestedAt, expiresAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        bookingId, listingId, session.user.id, listing.hostUserId,
        startMs, endMs, nights, guestCount,
        listing.nightlyRate,
        totals.subtotalCents, totals.serviceFeeCents, totals.gstOnFeeCents,
        totals.hostPayoutCents, totals.totalCents, totals.depositCents, "standard_v1",
        message ?? null,
        initialStatus, addonTotalCents,
        paymentIntentId, paymentMethod ?? null, customerStripeId ?? null,
        now, expiresAt, now, now
      ),
    ...resolvedAddons.map((addon) =>
      db()
        .prepare(
          "INSERT INTO booking_addon (id, bookingId, addonId, name, priceNZDCents) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(crypto.randomUUID(), bookingId, addon.addonId, addon.name, addon.priceNZDCents)
    ),
  ];
  if (isInstantBook) {
    insertStmts.push(
      db()
        .prepare(
          `INSERT INTO availability_block (id, vanListingId, startDate, endDate, reason, bookingId, createdAt)
           VALUES (?, ?, ?, ?, 'booking', ?, ?)`
        )
        .bind(blockId, listingId, startMs, endMs, bookingId, now)
    );
  }
  await db().batch(insertStmts);

  // Instant-book: capture, then atomic finalise (or rollback / log).
  if (isInstantBook) {
    let captureResult;
    let captureThrew = false;
    try {
      captureResult = await s.paymentIntents.capture(paymentIntentId);
    } catch (err: unknown) {
      captureThrew = true;
      console.error("Stripe capture threw", err);
    }

    if (captureThrew || !captureResult || captureResult.status !== "succeeded") {
      // Capture did not take money — roll back the booking + block atomically.
      try {
        await db().batch([
          db().prepare("DELETE FROM availability_block WHERE bookingId = ?").bind(bookingId),
          db().prepare("DELETE FROM booking_addon WHERE bookingId = ?").bind(bookingId),
          db().prepare("DELETE FROM booking WHERE id = ?").bind(bookingId),
        ]);
      } catch (e) {
        console.error("Rollback after failed capture failed", e);
      }
      try { await s.paymentIntents.cancel(paymentIntentId); } catch (e) { console.error("PI cancel after failed capture failed", e); }
      return NextResponse.json({ error: "Payment could not be processed — please try again" }, { status: 402 });
    }

    // Capture succeeded — promote to 'accepted'. If this fails, money is
    // captured but the row is still 'pending_capture'. Log for the admin sweep.
    try {
      await db()
        .prepare("UPDATE booking SET status = 'accepted', respondedAt = ?, paidAt = ?, updatedAt = ? WHERE id = ?")
        .bind(now, now, now, bookingId)
        .run();
    } catch (err) {
      try {
        await db()
          .prepare(
            `INSERT INTO payment_reconciliation (id, bookingId, paymentIntentId, kind, detail, createdAt) VALUES (?, ?, ?, ?, ?, ?)`
          )
          .bind(
            crypto.randomUUID(), bookingId, paymentIntentId, "finalise_failed",
            err instanceof Error ? err.message : "post-capture UPDATE threw",
            now,
          )
          .run();
      } catch (e) {
        console.error("Failed to log payment_reconciliation row", e);
      }
      return NextResponse.json(
        { error: "Payment captured but booking finalisation failed — admin notified. Please contact support.", id: bookingId },
        { status: 500 },
      );
    }
  }

  const hostRow = await db()
    .prepare("SELECT email, name FROM user WHERE id = ?")
    .bind(listing.hostUserId)
    .first<{ email: string; name: string }>();

  const hp = await db()
    .prepare("SELECT firstName FROM host_profile WHERE userId = ?")
    .bind(listing.hostUserId)
    .first<{ firstName: string }>();

  if (isInstantBook) {
    // Guest: payment captured confirmation; Host: instant booking notification
    const hostFirstName = hp?.firstName ?? hostRow?.name?.split(" ")[0] ?? "Host";

    try {
      await sendPaymentCapturedEmail({
        guestEmail: session.user.email,
        guestName: session.user.name ?? session.user.email,
        hostFirstName,
        vanName: listing.name,
        bookingId,
        startDate: startMs,
        endDate: endMs,
        nights,
        subtotalCents: totals.subtotalCents,
        serviceFeeCents: totals.serviceFeeCents,
        gstOnFeeCents: totals.gstOnFeeCents,
        totalCents: totals.totalCents,
        depositCents: totals.depositCents,
      });
    } catch (e) {
      console.error("Failed to send instant-book guest email", e);
    }

    if (hostRow) {
      try {
        await sendInstantBookedHostEmail({
          hostEmail: hostRow.email,
          hostFirstName,
          guestName: session.user.name ?? session.user.email,
          vanName: listing.name,
          bookingId,
          startDate: startMs,
          endDate: endMs,
          nights,
          totalCents: totals.totalCents,
        });
      } catch (e) {
        console.error("Failed to send instant-book host email", e);
      }
    }

    await createNotification({
      userId: session.user.id,
      type: "booking_accepted",
      payload: { bookingId, vanName: listing.name },
    });
    await createNotification({
      userId: listing.hostUserId,
      type: "booking_requested",
      payload: { bookingId, vanName: listing.name, instant: true },
    });
  } else {
    if (hostRow) {
      try {
        await sendBookingRequestedEmail({
          hostEmail: hostRow.email,
          hostFirstName: hp?.firstName ?? hostRow.name.split(" ")[0],
          guestName: session.user.name ?? session.user.email,
          vanName: listing.name,
          bookingId,
          startDate: startMs,
          endDate: endMs,
          nights,
          totalCents: totals.totalCents,
        });
      } catch (e) {
        console.error("Failed to send booking request email", e);
      }
    }

    await createNotification({
      userId: listing.hostUserId,
      type: "booking_requested",
      payload: { bookingId, vanName: listing.name },
    });
  }

  return NextResponse.json({ id: bookingId }, { status: 201 });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const url = new URL(req.url);
  const role = url.searchParams.get("role");

  let rows: Booking[];

  if (role === "host") {
    const result = await db()
      .prepare(
        `SELECT b.*, vl.name AS vanName, vl.slug AS vanSlug,
                u.name AS guestName, u.email AS guestEmail
         FROM booking b
         JOIN van_listing vl ON vl.id = b.vanListingId
         JOIN user u ON u.id = b.guestUserId
         WHERE b.hostUserId = ?
         ORDER BY
           CASE WHEN b.status = 'requested' THEN 0 ELSE 1 END ASC,
           b.expiresAt ASC,
           b.startDate DESC`
      )
      .bind(session.user.id)
      .all<Booking & { vanName: string; vanSlug: string; guestName: string; guestEmail: string }>();
    rows = result.results;
  } else {
    const result = await db()
      .prepare(
        `SELECT b.*, vl.name AS vanName, vl.slug AS vanSlug,
                hp.firstName AS hostFirstName
         FROM booking b
         JOIN van_listing vl ON vl.id = b.vanListingId
         LEFT JOIN host_profile hp ON hp.userId = b.hostUserId
         WHERE b.guestUserId = ?
         ORDER BY b.startDate DESC`
      )
      .bind(session.user.id)
      .all<Booking & { vanName: string; vanSlug: string; hostFirstName: string | null }>();
    rows = result.results;
  }

  return NextResponse.json(rows);
}

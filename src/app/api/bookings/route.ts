import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { calcBookingTotals } from "@/lib/money";
import { sendBookingRequestedEmail } from "@/lib/email";
import type { Booking, VanListing } from "@/lib/types";

const schema = z.object({
  listingId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
  guestCount: z.number().int().min(1).max(20),
  message: z.string().max(2000).optional().nullable(),
  paymentIntentId: z.string().min(1),
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

  const { listingId, startDate, endDate, guestCount, message, paymentIntentId } = parsed.data;

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

  const totals = calcBookingTotals(listing.nightlyRate, nights);

  // Sanity-check PI amount matches expected total
  if (pi.amount !== totals.totalCents) {
    return bad("Payment amount mismatch. Please start the booking again.");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 48 * 60 * 60;
  const bookingId = crypto.randomUUID();

  await db()
    .prepare(
      `INSERT INTO booking
         (id, vanListingId, guestUserId, hostUserId,
          startDate, endDate, nights, guestCount,
          nightlyRateCents, subtotalCents, serviceFeeCents, gstOnFeeCents,
          hostPayoutCents, totalCents, depositCents, cancellationPolicy,
          guestMessage, status,
          paymentIntentId, depositPaymentMethodId, customerStripeId,
          requestedAt, expiresAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      bookingId, listingId, session.user.id, listing.hostUserId,
      startMs, endMs, nights, guestCount,
      listing.nightlyRate,
      totals.subtotalCents, totals.serviceFeeCents, totals.gstOnFeeCents,
      totals.hostPayoutCents, totals.totalCents, totals.depositCents, "standard_v1",
      message ?? null,
      paymentIntentId, paymentMethod ?? null, customerStripeId ?? null,
      now, expiresAt, now, now
    )
    .run();

  const hostRow = await db()
    .prepare("SELECT email, name FROM user WHERE id = ?")
    .bind(listing.hostUserId)
    .first<{ email: string; name: string }>();

  const hp = await db()
    .prepare("SELECT firstName FROM host_profile WHERE userId = ?")
    .bind(listing.hostUserId)
    .first<{ firstName: string }>();

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

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendPaymentCapturedEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import type { Booking, HostProfile } from "@/lib/types";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id } = await params;

  const booking = await db()
    .prepare("SELECT * FROM booking WHERE id = ?")
    .bind(id)
    .first<Booking>();

  if (!booking) return bad("Not found", 404);
  if (booking.hostUserId !== session.user.id) return bad("Forbidden", 403);
  if (booking.status !== "requested") return bad("Booking is not in requested state");

  const nowSec = Math.floor(Date.now() / 1000);
  if (booking.expiresAt < nowSec) {
    await db()
      .prepare("UPDATE booking SET status = 'expired', updatedAt = ? WHERE id = ?")
      .bind(nowSec, id)
      .run();
    return bad("Booking request has expired");
  }

  const conflict = await db()
    .prepare(
      `SELECT COUNT(*) AS cnt FROM availability_block
       WHERE vanListingId = ? AND reason = 'booking'
         AND startDate <= ? AND endDate >= ?`
    )
    .bind(booking.vanListingId, booking.endDate, booking.startDate)
    .first<{ cnt: number }>();

  if ((conflict?.cnt ?? 0) > 0) {
    return bad("Those dates are no longer available — another booking was accepted first");
  }

  // Capture payment
  if (booking.paymentIntentId) {
    const s = await stripe();
    let captureResult;
    try {
      captureResult = await s.paymentIntents.capture(booking.paymentIntentId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment capture failed";
      return NextResponse.json({ error: `Could not charge payment: ${msg}` }, { status: 402 });
    }
    if (captureResult.status !== "succeeded") {
      return NextResponse.json({ error: "Payment capture did not succeed" }, { status: 402 });
    }
  }

  await db()
    .prepare(
      `UPDATE booking SET status = 'accepted', respondedAt = ?, paidAt = ?, updatedAt = ? WHERE id = ?`
    )
    .bind(nowSec, booking.paymentIntentId ? nowSec : null, nowSec, id)
    .run();

  const blockId = crypto.randomUUID();
  await db()
    .prepare(
      `INSERT INTO availability_block (id, vanListingId, startDate, endDate, reason, bookingId, createdAt)
       VALUES (?, ?, ?, ?, 'booking', ?, ?)`
    )
    .bind(blockId, booking.vanListingId, booking.startDate, booking.endDate, id, nowSec)
    .run();

  const guest = await db()
    .prepare("SELECT email, name FROM user WHERE id = ?")
    .bind(booking.guestUserId)
    .first<{ email: string; name: string }>();

  const hp = await db()
    .prepare("SELECT firstName FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<Pick<HostProfile, "firstName">>();

  const hostUser = await db()
    .prepare("SELECT name FROM user WHERE id = ?")
    .bind(session.user.id)
    .first<{ name: string }>();

  const listing = await db()
    .prepare("SELECT name FROM van_listing WHERE id = ?")
    .bind(booking.vanListingId)
    .first<{ name: string }>();

  if (guest) {
    try {
      await sendPaymentCapturedEmail({
        guestEmail: guest.email,
        guestName: guest.name,
        hostFirstName: hp?.firstName ?? hostUser?.name?.split(" ")[0] ?? "Your host",
        vanName: listing?.name ?? "",
        bookingId: id,
        startDate: booking.startDate,
        endDate: booking.endDate,
        nights: booking.nights,
        subtotalCents: booking.subtotalCents ?? booking.totalCents,
        serviceFeeCents: booking.serviceFeeCents ?? 0,
        gstOnFeeCents: booking.gstOnFeeCents ?? 0,
        totalCents: booking.totalCents,
        depositCents: booking.depositCents,
      });
    } catch (e) {
      console.error("Failed to send payment captured email", e);
    }
  }

  await createNotification({
    userId: booking.guestUserId,
    type: "booking_accepted",
    payload: { bookingId: id, vanName: listing?.name ?? "" },
  });

  return NextResponse.json({ ok: true });
}

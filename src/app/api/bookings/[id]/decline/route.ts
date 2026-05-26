import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendBookingDeclinedEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import type { Booking } from "@/lib/types";

const schema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  req: Request,
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

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const reason = parsed.success ? (parsed.data.reason?.trim() || null) : null;

  const nowSec = Math.floor(Date.now() / 1000);
  try {
    await db()
      .prepare("INSERT INTO booking_transition_lock (bookingId, operation, createdAt) VALUES (?, 'decline', ?)")
      .bind(id, nowSec)
      .run();
  } catch {
    return bad("This booking is currently being processed. Please refresh and try again.", 409);
  }

  const current = await db()
    .prepare("SELECT status FROM booking WHERE id = ?")
    .bind(id)
    .first<{ status: string }>();
  if (current?.status !== "requested") {
    await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(id).run();
    return bad("Booking is not in requested state");
  }

  // Cancel the PaymentIntent to release the authorization hold
  if (booking.paymentIntentId) {
    try {
      const s = await stripe();
      await s.paymentIntents.cancel(
        booking.paymentIntentId,
        {},
        { idempotencyKey: `booking-decline-authorization-${id}` }
      );
    } catch (e) {
      console.error("Failed to cancel PaymentIntent on decline", e);
      await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(id).run();
      return bad("Could not release the payment authorization. Please try again.", 502);
    }
  }

  await db().batch([
    db()
      .prepare(
        `UPDATE booking SET status = 'declined', statusReason = ?, respondedAt = ?, updatedAt = ? WHERE id = ?`
      )
      .bind(reason, nowSec, nowSec, id),
    db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(id),
  ]);

  const [guest, listing] = await Promise.all([
    db().prepare("SELECT email, name FROM user WHERE id = ?").bind(booking.guestUserId).first<{ email: string; name: string }>(),
    db().prepare("SELECT name FROM van_listing WHERE id = ?").bind(booking.vanListingId).first<{ name: string }>(),
  ]);

  if (guest) {
    try {
      await sendBookingDeclinedEmail({
        guestEmail: guest.email,
        guestName: guest.name,
        vanName: listing?.name ?? "",
        bookingId: id,
        reason,
      });
    } catch (e) {
      console.error("Failed to send booking declined email", e);
    }
  }

  await createNotification({
    userId: booking.guestUserId,
    type: "booking_declined",
    payload: { bookingId: id, vanName: listing?.name ?? "", recipientRole: "guest" },
  });

  return NextResponse.json({ ok: true });
}

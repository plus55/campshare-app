import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import type { Booking } from "@/lib/types";

type ExpirableBooking = Pick<Booking, "id" | "status" | "expiresAt" | "paymentIntentId">;

export async function expireBookingRequest(
  booking: ExpirableBooking,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<boolean> {
  if (booking.status !== "requested" || booking.expiresAt >= nowSec) return false;

  try {
    await db()
      .prepare("INSERT INTO booking_transition_lock (bookingId, operation, createdAt) VALUES (?, 'expire', ?)")
      .bind(booking.id, nowSec)
      .run();
  } catch {
    return false;
  }

  const current = await db()
    .prepare("SELECT status, expiresAt, paymentIntentId FROM booking WHERE id = ?")
    .bind(booking.id)
    .first<Pick<Booking, "status" | "expiresAt" | "paymentIntentId">>();
  if (!current || current.status !== "requested" || current.expiresAt >= nowSec) {
    await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(booking.id).run();
    return false;
  }

  if (current.paymentIntentId) {
    try {
      const s = await stripe();
      await s.paymentIntents.cancel(
        current.paymentIntentId,
        {},
        { idempotencyKey: `booking-expire-authorization-${booking.id}` }
      );
    } catch (e) {
      console.error(`Failed to release expired booking authorization ${booking.id}`, e);
      await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(booking.id).run();
      return false;
    }
  }

  await db().batch([
    db()
      .prepare("UPDATE booking SET status = 'expired', updatedAt = ? WHERE id = ? AND status = 'requested'")
      .bind(nowSec, booking.id),
    db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(booking.id),
  ]);
  return true;
}

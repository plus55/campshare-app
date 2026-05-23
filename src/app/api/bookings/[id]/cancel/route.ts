import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { computeRefundCents } from "@/lib/cancellation";
import { sendBookingCancelledEmail, sendRefundProcessedEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import type { Booking } from "@/lib/types";

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

  const isGuest = booking.guestUserId === session.user.id;
  const isHost  = booking.hostUserId  === session.user.id;
  if (!isGuest && !isHost) return bad("Forbidden", 403);

  const cancellable = ["requested", "accepted"].includes(booking.status);
  if (!cancellable) return bad("Booking cannot be cancelled in its current state");

  const nowSec = Math.floor(Date.now() / 1000);
  const nowMs  = nowSec * 1000;
  const newStatus = isGuest ? "cancelled_by_guest" : "cancelled_by_host";

  try {
    await db()
      .prepare("INSERT INTO booking_transition_lock (bookingId, operation, createdAt) VALUES (?, 'cancel', ?)")
      .bind(id, nowSec)
      .run();
  } catch {
    return bad("This booking is currently being processed. Please refresh and try again.", 409);
  }

  const current = await db()
    .prepare("SELECT status FROM booking WHERE id = ?")
    .bind(id)
    .first<{ status: string }>();
  if (!current || !["requested", "accepted"].includes(current.status)) {
    await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(id).run();
    return bad("Booking cannot be cancelled in its current state");
  }

  // Handle Stripe: cancel or refund PI
  let refundCents = 0;
  if (booking.paymentIntentId) {
    const s = await stripe();

    if (booking.status === "requested") {
      // PI is still in requires_capture — cancel it (no money moved)
      try {
        await s.paymentIntents.cancel(
          booking.paymentIntentId,
          {},
          { idempotencyKey: `booking-cancel-authorization-${id}` }
        );
      } catch (e) {
        console.error("Failed to cancel PI on cancel", e);
        await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(id).run();
        return bad("Could not release the payment authorization. Please try again.", 502);
      }
    } else {
      // accepted or in_progress — PI was captured; issue a refund per policy
      // Host cancellation always gives 100% back; guest follows platform policy
      if (isHost) {
        refundCents = booking.totalCents;
      } else {
        const { refundCents: rc } = computeRefundCents(booking.totalCents, nowMs, booking.startDate);
        refundCents = rc;
      }

      if (refundCents > 0) {
        try {
          await s.refunds.create(
            {
              payment_intent: booking.paymentIntentId,
              amount: refundCents,
            },
            { idempotencyKey: `booking-cancel-refund-${id}` }
          );
        } catch (e) {
          console.error("Failed to create Stripe refund", e);
          await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(id).run();
          return bad("Could not process the refund. Please try again.", 502);
        }
      }

      // Cancel deposit hold PI if it exists
      if (booking.depositPaymentIntentId) {
        try {
          await s.paymentIntents.cancel(
            booking.depositPaymentIntentId,
            {},
            { idempotencyKey: `booking-cancel-deposit-${id}` }
          );
        } catch (e) {
          console.error("Failed to cancel deposit PI", e);
          await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(id).run();
          return bad("Could not release the security deposit authorization. Please try again.", 502);
        }
      }
    }
  }

  // Atomic: status flip + (optional) availability block release.
  const stmts = [
    db()
      .prepare(`UPDATE booking SET status = ?, cancelledAt = ?, updatedAt = ? WHERE id = ?`)
      .bind(newStatus, nowSec, nowSec, id),
    db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(id),
  ];
  if (booking.status === "accepted" || booking.status === "in_progress") {
    stmts.push(
      db().prepare("DELETE FROM availability_block WHERE bookingId = ?").bind(id)
    );
  }
  await db().batch(stmts);

  const [guest, host, listing] = await Promise.all([
    db().prepare("SELECT email, name FROM user WHERE id = ?").bind(booking.guestUserId).first<{ email: string; name: string }>(),
    db().prepare("SELECT email, name FROM user WHERE id = ?").bind(booking.hostUserId).first<{ email: string; name: string }>(),
    db().prepare("SELECT name FROM van_listing WHERE id = ?").bind(booking.vanListingId).first<{ name: string }>(),
  ]);

  const cancelledByRole = isGuest ? "guest" : "host";
  const recipient = isGuest ? host : guest;

  if (recipient) {
    try {
      await sendBookingCancelledEmail({
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        cancelledByRole,
        vanName: listing?.name ?? "",
        bookingId: id,
        startDate: booking.startDate,
        endDate: booking.endDate,
      });
    } catch (e) {
      console.error("Failed to send booking cancelled email", e);
    }
  }

  // Email the guest about their refund if applicable
  if (refundCents > 0 && guest && booking.paymentIntentId) {
    try {
      await sendRefundProcessedEmail({
        guestEmail: guest.email,
        guestName: guest.name,
        vanName: listing?.name ?? "",
        bookingId: id,
        refundCents,
      });
    } catch (e) {
      console.error("Failed to send refund email", e);
    }
  }

  // Notify the OTHER party
  const notifyUserId = isGuest ? booking.hostUserId : booking.guestUserId;
  await createNotification({
    userId: notifyUserId,
    type: "booking_cancelled",
    payload: { bookingId: id, vanName: listing?.name ?? "" },
  });

  return NextResponse.json({ ok: true });
}

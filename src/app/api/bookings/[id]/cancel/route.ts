import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { sendBookingCancelledEmail } from "@/lib/email";
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

  const cancellable = booking.status === "requested" || booking.status === "accepted";
  if (!cancellable) return bad("Booking cannot be cancelled in its current state");

  const nowSec = Math.floor(Date.now() / 1000);
  const newStatus = isGuest ? "cancelled_by_guest" : "cancelled_by_host";

  await db()
    .prepare(
      `UPDATE booking SET status = ?, cancelledAt = ?, updatedAt = ? WHERE id = ?`
    )
    .bind(newStatus, nowSec, nowSec, id)
    .run();

  // If it was accepted, remove the linked availability block
  if (booking.status === "accepted") {
    await db()
      .prepare("DELETE FROM availability_block WHERE bookingId = ?")
      .bind(id)
      .run();
  }

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

  return NextResponse.json({ ok: true });
}

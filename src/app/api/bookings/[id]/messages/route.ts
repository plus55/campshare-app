import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { sendBookingMessageEmail } from "@/lib/email";
import type { Booking, BookingMessage } from "@/lib/types";

const schema = z.object({
  body: z.string().min(1).max(4000),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id } = await params;

  const booking = await db()
    .prepare("SELECT guestUserId, hostUserId FROM booking WHERE id = ?")
    .bind(id)
    .first<Pick<Booking, "guestUserId" | "hostUserId">>();

  if (!booking) return bad("Not found", 404);
  if (booking.guestUserId !== session.user.id && booking.hostUserId !== session.user.id) {
    return bad("Forbidden", 403);
  }

  const msgs = await db()
    .prepare(
      `SELECT bm.*, u.name AS senderName
       FROM booking_message bm
       JOIN user u ON u.id = bm.senderUserId
       WHERE bm.bookingId = ?
       ORDER BY bm.createdAt ASC`
    )
    .bind(id)
    .all<BookingMessage & { senderName: string }>();

  return NextResponse.json(msgs.results);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id } = await params;

  const booking = await db()
    .prepare(
      `SELECT b.*, vl.name AS vanName
       FROM booking b
       JOIN van_listing vl ON vl.id = b.vanListingId
       WHERE b.id = ?`
    )
    .bind(id)
    .first<Booking & { vanName: string }>();

  if (!booking) return bad("Not found", 404);

  const isGuest = booking.guestUserId === session.user.id;
  const isHost  = booking.hostUserId  === session.user.id;
  if (!isGuest && !isHost) return bad("Forbidden", 403);

  const active = ["requested", "accepted"].includes(booking.status);
  if (!active) return bad("Cannot message on a closed booking");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const msgId = crypto.randomUUID();
  const nowSec = Math.floor(Date.now() / 1000);

  await db()
    .prepare(
      "INSERT INTO booking_message (id, bookingId, senderUserId, body, createdAt) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(msgId, id, session.user.id, parsed.data.body, nowSec)
    .run();

  // Rate-limit email: skip if sender sent a message to same recipient in last 5 min
  const recipientId = isGuest ? booking.hostUserId : booking.guestUserId;
  const fiveMinAgo = nowSec - 300;
  const recentMsg = await db()
    .prepare(
      `SELECT COUNT(*) AS cnt FROM booking_message
       WHERE bookingId = ? AND senderUserId = ? AND createdAt >= ?`
    )
    .bind(id, session.user.id, fiveMinAgo)
    .first<{ cnt: number }>();

  if ((recentMsg?.cnt ?? 0) <= 1) {
    const recipient = await db()
      .prepare("SELECT email, name FROM user WHERE id = ?")
      .bind(recipientId)
      .first<{ email: string; name: string }>();

    if (recipient) {
      try {
        await sendBookingMessageEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          senderName: session.user.name ?? session.user.email,
          vanName: booking.vanName,
          bookingId: id,
          messagePreview: parsed.data.body,
          viewerRole: isGuest ? "host" : "guest",
        });
      } catch (e) {
        console.error("Failed to send message notification email", e);
      }
    }
  }

  return NextResponse.json({ id: msgId }, { status: 201 });
}

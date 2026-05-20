import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { sendBookingDeclinedEmail } from "@/lib/email";
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
  await db()
    .prepare(
      `UPDATE booking SET status = 'declined', statusReason = ?, respondedAt = ?, updatedAt = ? WHERE id = ?`
    )
    .bind(reason, nowSec, nowSec, id)
    .run();

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

  return NextResponse.json({ ok: true });
}

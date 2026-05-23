import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const schema = z.object({
  bookingId: z.string().min(1),
  reason: z.enum([
    "damage",
    "cleanliness",
    "misrepresentation",
    "no_show_host",
    "no_show_guest",
    "other",
  ]),
  details: z.string().min(10).max(4000),
  evidenceUrls: z.array(z.string().url()).max(10).optional().default([]),
});

const DISPUTE_WINDOW_SEC = 7 * 24 * 3600;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { bookingId, reason, details, evidenceUrls } = parsed.data;

  const booking = await db()
    .prepare("SELECT id, guestUserId, hostUserId, status, completedAt, endDate FROM booking WHERE id = ?")
    .bind(bookingId)
    .first<{
      id: string;
      guestUserId: string;
      hostUserId: string;
      status: string;
      completedAt: number | null;
      endDate: number;
    }>();

  if (!booking) return bad("Booking not found", 404);
  if (booking.guestUserId !== session.user.id && booking.hostUserId !== session.user.id) {
    return bad("Forbidden", 403);
  }
  if (booking.status !== "completed") {
    return bad("Disputes can only be opened on completed bookings");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  // Anchor the window on completedAt if present, otherwise endDate (which is ms)
  const anchorSec = booking.completedAt ?? Math.floor(booking.endDate / 1000);
  if (nowSec - anchorSec > DISPUTE_WINDOW_SEC) {
    return bad("The 7-day dispute window has closed for this booking");
  }

  // Prevent duplicate open disputes from the same user on the same booking
  const existing = await db()
    .prepare(
      `SELECT id FROM dispute
       WHERE bookingId = ? AND initiatorUserId = ?
         AND status IN ('open','under_review')`
    )
    .bind(bookingId, session.user.id)
    .first<{ id: string }>();
  if (existing) {
    return NextResponse.json({ id: existing.id, alreadyOpen: true });
  }

  const id = crypto.randomUUID();
  await db()
    .prepare(
      `INSERT INTO dispute
         (id, bookingId, initiatorUserId, reason, details, evidenceUrls, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`
    )
    .bind(
      id,
      bookingId,
      session.user.id,
      reason,
      details,
      evidenceUrls.length > 0 ? JSON.stringify(evidenceUrls) : null,
      nowSec
    )
    .run();

  return NextResponse.json({ id }, { status: 201 });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const url = new URL(req.url);
  const bookingId = url.searchParams.get("bookingId");
  if (!bookingId) return bad("Missing bookingId");

  const booking = await db()
    .prepare("SELECT guestUserId, hostUserId FROM booking WHERE id = ?")
    .bind(bookingId)
    .first<{ guestUserId: string; hostUserId: string }>();
  if (!booking) return bad("Booking not found", 404);
  if (booking.guestUserId !== session.user.id && booking.hostUserId !== session.user.id) {
    return bad("Forbidden", 403);
  }

  const rows = await db()
    .prepare("SELECT * FROM dispute WHERE bookingId = ? ORDER BY createdAt DESC")
    .bind(bookingId)
    .all();
  return NextResponse.json(rows.results);
}

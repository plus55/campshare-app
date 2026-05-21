import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { Booking, ReviewRole } from "@/lib/types";

const schema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(20, "Review must be at least 20 characters").max(4000),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const bookingId = new URL(req.url).searchParams.get("bookingId");
  if (!bookingId) return bad("bookingId required");

  const booking = await db()
    .prepare("SELECT guestUserId, hostUserId FROM booking WHERE id = ?")
    .bind(bookingId)
    .first<Pick<Booking, "guestUserId" | "hostUserId">>();
  if (!booking) return bad("Booking not found", 404);

  const isGuest = booking.guestUserId === session.user.id;
  const isHost = booking.hostUserId === session.user.id;
  if (!isGuest && !isHost) return bad("Forbidden", 403);

  const role: ReviewRole = isGuest ? "guest" : "host";
  const existing = await db()
    .prepare(
      "SELECT id, rating, text, createdAt FROM review WHERE bookingId = ? AND role = ?"
    )
    .bind(bookingId, role)
    .first<{ id: string; rating: number; text: string; createdAt: number }>();

  return NextResponse.json({ review: existing ?? null });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");
  const { bookingId, rating, text } = parsed.data;

  const booking = await db()
    .prepare(
      "SELECT id, vanListingId, guestUserId, hostUserId, status FROM booking WHERE id = ?"
    )
    .bind(bookingId)
    .first<Pick<Booking, "id" | "vanListingId" | "guestUserId" | "hostUserId" | "status">>();
  if (!booking) return bad("Booking not found", 404);

  if (booking.status !== "completed") {
    return bad("You can only review a completed booking", 409);
  }

  const isGuest = booking.guestUserId === session.user.id;
  const isHost = booking.hostUserId === session.user.id;
  if (!isGuest && !isHost) return bad("Forbidden", 403);

  const role: ReviewRole = isGuest ? "guest" : "host";
  const subjectUserId = isGuest ? booking.hostUserId : booking.guestUserId;

  const existing = await db()
    .prepare("SELECT id FROM review WHERE bookingId = ? AND role = ?")
    .bind(bookingId, role)
    .first<{ id: string }>();
  if (existing) return bad("You have already reviewed this booking", 409);

  const id = crypto.randomUUID();
  const nowSec = Math.floor(Date.now() / 1000);

  await db()
    .prepare(
      `INSERT INTO review
        (id, bookingId, authorUserId, subjectUserId, vanListingId, role, rating, text, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, bookingId, session.user.id, subjectUserId, booking.vanListingId, role, rating, text, nowSec)
    .run();

  return NextResponse.json({ ok: true, id }, { status: 201 });
}

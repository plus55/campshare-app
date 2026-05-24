import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { calcBookingTotals } from "@/lib/money";
import { createNotification } from "@/lib/notifications";
import type { Booking } from "@/lib/types";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function parseDateToMs(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

const createSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Guest creates a date-change request for an accepted booking.
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
  if (booking.guestUserId !== session.user.id) return bad("Forbidden", 403);
  if (booking.status !== "accepted") {
    return bad("Date changes can only be requested after a booking is accepted");
  }

  const listing = await db()
    .prepare("SELECT minimumNights FROM van_listing WHERE id = ?")
    .bind(booking.vanListingId)
    .first<{ minimumNights: number }>();

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const newStartMs = parseDateToMs(parsed.data.startDate);
  const newEndMs = parseDateToMs(parsed.data.endDate);
  if (newEndMs <= newStartMs) return bad("End date must be after start date");

  const newNights = Math.round((newEndMs - newStartMs) / 86_400_000);
  const minNights = listing?.minimumNights ?? 1;
  if (newNights < minNights) return bad(`Minimum stay is ${minNights} nights`);

  const conflict = await db()
    .prepare(
      `SELECT COUNT(*) AS cnt FROM availability_block
       WHERE vanListingId = ? AND (bookingId IS NULL OR bookingId != ?)
         AND startDate <= ? AND endDate >= ?`
    )
    .bind(booking.vanListingId, id, newEndMs, newStartMs)
    .first<{ cnt: number }>();
  if ((conflict?.cnt ?? 0) > 0) return bad("Those dates are not available");

  const newTotals = calcBookingTotals(booking.nightlyRateCents, newNights, booking.addonTotalCents ?? 0);
  const priceDiffCents = newTotals.totalCents - booking.totalCents;
  const now = Math.floor(Date.now() / 1000);

  await db()
    .prepare("UPDATE date_change_request SET status = 'cancelled', respondedAt = ? WHERE bookingId = ? AND status = 'pending'")
    .bind(now, id)
    .run();

  const dcId = crypto.randomUUID();
  await db()
    .prepare(
      `INSERT INTO date_change_request
         (id, bookingId, requestedByUserId, newStartDate, newEndDate, newNights, priceDiffCents, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .bind(dcId, id, session.user.id, newStartMs, newEndMs, newNights, priceDiffCents, now)
    .run();

  await createNotification({
    userId: booking.hostUserId,
    type: "booking_requested",
    payload: { bookingId: id, dateChangeId: dcId, vanName: "", action: "date_change_requested" },
  });

  return NextResponse.json({ id: dcId, priceDiffCents }, { status: 201 });
}

const patchSchema = z.object({
  action: z.enum(["accept", "decline"]),
  dateChangeId: z.string().min(1),
});

// Host accepts or declines a pending date-change request.
export async function PATCH(
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
  if (booking.status !== "accepted") {
    return bad("Date changes can only be applied to accepted bookings");
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { action, dateChangeId } = parsed.data;
  const dcr = await db()
    .prepare("SELECT * FROM date_change_request WHERE id = ? AND bookingId = ? AND status = 'pending'")
    .bind(dateChangeId, id)
    .first<{
      id: string;
      bookingId: string;
      newStartDate: number;
      newEndDate: number;
      newNights: number;
      priceDiffCents: number;
    }>();
  if (!dcr) return bad("Date change request not found or already resolved");

  const now = Math.floor(Date.now() / 1000);
  if (action === "decline") {
    await db()
      .prepare("UPDATE date_change_request SET status = 'declined', respondedAt = ? WHERE id = ?")
      .bind(now, dateChangeId)
      .run();
    await createNotification({
      userId: booking.guestUserId,
      type: "booking_requested",
      payload: { bookingId: id, action: "date_change_declined" },
    });
    return NextResponse.json({ ok: true });
  }

  if (dcr.priceDiffCents !== 0) {
    return bad(
      "Price-changing date requests cannot be accepted yet. Decline this request and create a replacement booking.",
      409
    );
  }

  const newTotals = calcBookingTotals(booking.nightlyRateCents, dcr.newNights, booking.addonTotalCents ?? 0);
  try {
    await db()
      .prepare("INSERT INTO booking_transition_lock (bookingId, operation, createdAt) VALUES (?, 'date-change', ?)")
      .bind(id, now)
      .run();
  } catch {
    return bad("This booking is currently being processed. Please refresh and try again.", 409);
  }

  const current = await db()
    .prepare("SELECT status FROM booking WHERE id = ?")
    .bind(id)
    .first<{ status: string }>();
  if (current?.status !== "accepted") {
    await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(id).run();
    return bad("Date changes can only be applied to accepted bookings");
  }

  try {
    await db().batch([
      db()
        .prepare("UPDATE availability_block SET startDate = ?, endDate = ? WHERE bookingId = ? AND reason = 'booking'")
        .bind(dcr.newStartDate, dcr.newEndDate, id),
      db()
        .prepare(
          `UPDATE booking SET startDate = ?, endDate = ?, nights = ?,
             totalCents = ?, hostPayoutCents = ?, updatedAt = ?
           WHERE id = ? AND status = 'accepted'`
        )
        .bind(
          dcr.newStartDate,
          dcr.newEndDate,
          dcr.newNights,
          newTotals.totalCents,
          newTotals.hostPayoutCents,
          now,
          id
        ),
      db()
        .prepare("UPDATE date_change_request SET status = 'accepted', respondedAt = ? WHERE id = ?")
        .bind(now, dateChangeId),
      db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(id),
    ]);
  } catch (e) {
    await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(id).run();
    console.error("Could not reserve updated booking dates", e);
    return bad("Those dates are no longer available.", 409);
  }

  await createNotification({
    userId: booking.guestUserId,
    type: "booking_accepted",
    payload: { bookingId: id, action: "date_change_accepted" },
  });
  return NextResponse.json({ ok: true });
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
    .first<{ guestUserId: string; hostUserId: string }>();

  if (!booking) return bad("Not found", 404);
  if (booking.guestUserId !== session.user.id && booking.hostUserId !== session.user.id) {
    return bad("Forbidden", 403);
  }

  const dcr = await db()
    .prepare("SELECT * FROM date_change_request WHERE bookingId = ? ORDER BY createdAt DESC LIMIT 1")
    .bind(id)
    .first();
  return NextResponse.json(dcr ?? null);
}

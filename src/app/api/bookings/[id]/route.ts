import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { Booking } from "@/lib/types";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getBookingWithDetails(id: string) {
  return db()
    .prepare(
      `SELECT b.*,
              vl.name AS vanName, vl.slug AS vanSlug, vl.nightlyRate AS vanNightlyRate,
              u_guest.name AS guestName, u_guest.email AS guestEmail,
              u_host.name  AS hostName,  u_host.email  AS hostEmail,
              hp.firstName AS hostFirstName
       FROM booking b
       JOIN van_listing vl   ON vl.id   = b.vanListingId
       JOIN user u_guest      ON u_guest.id = b.guestUserId
       JOIN user u_host       ON u_host.id  = b.hostUserId
       LEFT JOIN host_profile hp ON hp.userId = b.hostUserId
       WHERE b.id = ?`
    )
    .bind(id)
    .first<Booking & {
      vanName: string;
      vanSlug: string;
      vanNightlyRate: number;
      guestName: string;
      guestEmail: string;
      hostName: string;
      hostEmail: string;
      hostFirstName: string | null;
    }>();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id } = await params;
  const booking = await getBookingWithDetails(id);
  if (!booking) return bad("Not found", 404);
  if (booking.guestUserId !== session.user.id && booking.hostUserId !== session.user.id) {
    return bad("Forbidden", 403);
  }

  // Lazy expiry
  if (booking.status === "requested") {
    const nowSec = Math.floor(Date.now() / 1000);
    if (booking.expiresAt < nowSec) {
      await db()
        .prepare("UPDATE booking SET status = 'expired', updatedAt = ? WHERE id = ?")
        .bind(nowSec, id)
        .run();
      booking.status = "expired";
    }
  }

  return NextResponse.json(booking);
}

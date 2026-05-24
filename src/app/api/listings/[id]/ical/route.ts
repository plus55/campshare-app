import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { buildIcal, syncIcalFeed, validateIcalFeedUrl } from "@/lib/ical";
import type { IcalEvent } from "@/lib/ical";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Public: calendar apps subscribe to this without auth.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = await db()
    .prepare("SELECT id, name, status FROM van_listing WHERE id = ?")
    .bind(id)
    .first<{ id: string; name: string; status: string }>();

  if (!listing || listing.status === "draft") {
    return new Response("Not found", { status: 404 });
  }

  const [bookingsResult, blocksResult] = await Promise.all([
    db()
      .prepare(
        `SELECT id, startDate, endDate FROM booking
         WHERE vanListingId = ? AND status IN ('accepted','in_progress','completed')`
      )
      .bind(id)
      .all<{ id: string; startDate: number; endDate: number }>(),
    db()
      .prepare(
        `SELECT id, startDate, endDate FROM availability_block
         WHERE vanListingId = ? AND reason IN ('host-blocked','maintenance') AND icalUid IS NULL`
      )
      .bind(id)
      .all<{ id: string; startDate: number; endDate: number }>(),
  ]);

  const events: IcalEvent[] = [
    ...bookingsResult.results.map((b) => ({
      uid: `booking-${b.id}@campshare.co.nz`,
      startMs: b.startDate,
      endMs: b.endDate + 86_400_000,
      summary: "Booked",
    })),
    ...blocksResult.results.map((b) => ({
      uid: `block-${b.id}@campshare.co.nz`,
      startMs: b.startDate,
      endMs: b.endDate + 86_400_000,
      summary: "Unavailable",
    })),
  ];

  const body = buildIcal(`${listing.name} - CampShare`, events);
  const filename = listing.name.replace(/[^a-z0-9]/gi, "_") + ".ics";

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store",
    },
  });
}

// Set iCal import URL and trigger an immediate sync.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id } = await params;
  const listing = await db()
    .prepare("SELECT id FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<{ id: string }>();
  if (!listing) return bad("Not found", 404);

  const body = (await req.json().catch(() => null)) as { url?: string } | null;
  const submittedUrl = body?.url?.trim();
  if (!submittedUrl) return bad("url is required");

  let url: string;
  try {
    url = validateIcalFeedUrl(submittedUrl);
  } catch {
    return bad("A public HTTPS iCal feed URL is required.");
  }

  try {
    await syncIcalFeed(id, url);
  } catch (e) {
    console.error("Initial iCal sync failed:", e);
    return bad("Initial sync failed. Check that this is a valid iCal feed and try again.", 422);
  }

  const now = Math.floor(Date.now() / 1000);
  await db()
    .prepare("UPDATE van_listing SET icalFeedUrl = ?, updatedAt = ? WHERE id = ?")
    .bind(url, now, id)
    .run();

  return NextResponse.json({ ok: true });
}

// Clear iCal import URL and remove all iCal-sourced blocks.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id } = await params;
  const listing = await db()
    .prepare("SELECT id FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<{ id: string }>();
  if (!listing) return bad("Not found", 404);

  const now = Math.floor(Date.now() / 1000);
  await db()
    .prepare("UPDATE van_listing SET icalFeedUrl = NULL, updatedAt = ? WHERE id = ?")
    .bind(now, id)
    .run();

  await db()
    .prepare(
      "DELETE FROM availability_block WHERE vanListingId = ? AND icalUid IS NOT NULL"
    )
    .bind(id)
    .run();

  return NextResponse.json({ ok: true });
}

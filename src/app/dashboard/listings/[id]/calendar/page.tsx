import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { AvailabilityBlock, VanListing } from "@/lib/types";
import AvailabilityCalendar from "./AvailabilityCalendar";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const listing = await db()
    .prepare(
      "SELECT id, name, hostUserId, icalFeedUrl FROM van_listing WHERE id = ? AND hostUserId = ?"
    )
    .bind(id, session.user.id)
    .first<Pick<VanListing, "id" | "name" | "hostUserId" | "icalFeedUrl">>();

  if (!listing) notFound();

  const blocks = await db()
    .prepare(
      "SELECT * FROM availability_block WHERE vanListingId = ? ORDER BY startDate ASC"
    )
    .bind(id)
    .all<AvailabilityBlock>();

  const appBase =
    process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";
  const exportUrl = `${appBase}/api/listings/${id}/ical`;

  return (
    <main className="cs-page">
      <div className="cs-narrow">
        <Link href={`/dashboard/listings/${id}`} className="cs-small">
          ← {listing.name}
        </Link>
        <h1 style={{ marginTop: 12 }}>Availability</h1>
        <p className="cs-muted">
          Click to block / unblock dates. Blocked dates are greyed on your
          public page.
        </p>
        <div style={{ marginTop: 24 }}>
          <AvailabilityCalendar
            listingId={id}
            initialBlocks={blocks.results}
            icalFeedUrl={listing.icalFeedUrl}
            exportUrl={exportUrl}
          />
        </div>
      </div>
    </main>
  );
}

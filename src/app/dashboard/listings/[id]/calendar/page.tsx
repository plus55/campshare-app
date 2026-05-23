import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import type { AvailabilityBlock, VanListing } from "@/lib/types";
import AvailabilityCalendar from "./AvailabilityCalendar";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const database = await getDb();

  const listing = await database
    .prepare(
      "SELECT id, name, hostUserId, icalFeedUrl FROM van_listing WHERE id = ? AND hostUserId = ?"
    )
    .bind(id, session.user.id)
    .first<Pick<VanListing, "id" | "name" | "hostUserId" | "icalFeedUrl">>();

  if (!listing) notFound();

  const blocks = await database
    .prepare(
      "SELECT * FROM availability_block WHERE vanListingId = ? ORDER BY startDate ASC"
    )
    .bind(id)
    .all<AvailabilityBlock>();

  const appBase =
    process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";
  const exportUrl = `${appBase}/api/listings/${id}/ical`;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[720px]">
        <p className="mb-2 text-sm">
          <Link href={`/dashboard/listings/${id}`} className="text-stone hover:text-charcoal">
            ← {listing.name}
          </Link>
        </p>
        <h1 className="mb-1 font-serif text-3xl text-forest-deep">Availability</h1>
        <p className="mb-6 text-stone">
          Click to block / unblock dates. Blocked dates are greyed on your public page.
        </p>
        <AvailabilityCalendar
          listingId={id}
          initialBlocks={blocks.results}
          icalFeedUrl={listing.icalFeedUrl}
          exportUrl={exportUrl}
        />
      </div>
    </main>
  );
}

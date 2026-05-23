import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getInstantBookEligibleHosts } from "@/lib/badges";
import ListingCard, { type SearchResult } from "@/app/vans/ListingCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SavedSearches } from "./SavedSearches";

export const metadata: Metadata = {
  title: "Saved — CampShare",
};

type Tab = "vans" | "searches";

interface SavedSearchRow {
  id: string;
  label: string | null;
  filters: string;
  lastAlertedAt: number | null;
  createdAt: number;
}

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireSession();
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "searches" ? "searches" : "vans";
  const database = await getDb();

  const [vansResult, searchesResult] = await Promise.all([
    database
      .prepare(
        `SELECT
          vl.id, vl.slug, vl.name, vl.vanType, vl.region, vl.island,
          vl.nightlyRate, vl.sleeps, vl.petFriendly, vl.instantBook, vl.hostUserId,
          vl.minimumNights, vl.pickupLat, vl.pickupLng, vl.pickupLocationText,
          hp.firstName AS hostFirstName,
          u.image      AS hostImage,
          COALESCE(rv.avgRating, NULL) AS avgRating,
          COALESCE(rv.reviewCount, 0) AS reviewCount,
          1            AS isWishlisted,
          (SELECT r2Key FROM van_photo
           WHERE vanListingId = vl.id
           ORDER BY position ASC, createdAt ASC LIMIT 1) AS coverPhotoKey
         FROM wishlist w
         JOIN van_listing vl ON vl.id = w.vanListingId
         LEFT JOIN host_profile hp ON hp.userId = vl.hostUserId
         LEFT JOIN user u          ON u.id      = vl.hostUserId
         LEFT JOIN (
           SELECT b.vanListingId,
                  AVG(r.rating) AS avgRating,
                  COUNT(*)      AS reviewCount
           FROM review r
           JOIN booking b ON b.id = r.bookingId
           WHERE r.role = 'guest'
             AND (
               EXISTS (SELECT 1 FROM review r2 WHERE r2.bookingId = r.bookingId AND r2.role = 'host')
               OR (b.endDate / 1000 + 1296000) <= unixepoch()
             )
           GROUP BY b.vanListingId
         ) rv ON rv.vanListingId = vl.id
         WHERE w.userId = ? AND vl.status = 'published'
         ORDER BY w.createdAt DESC`
      )
      .bind(session.user.id)
      .all<SearchResult>(),
    database
      .prepare("SELECT id, label, filters, lastAlertedAt, createdAt FROM saved_search WHERE userId = ? ORDER BY createdAt DESC")
      .bind(session.user.id)
      .all<SavedSearchRow>(),
  ]);

  const ibHostIds = Array.from(new Set(vansResult.results.filter((l) => l.instantBook).map((l) => l.hostUserId)));
  const eligibleHosts = await getInstantBookEligibleHosts(ibHostIds);
  const listings = vansResult.results.map((l) => ({
    ...l,
    instantBook: l.instantBook && eligibleHosts.has(l.hostUserId) ? 1 : 0,
  }));
  const savedSearches = searchesResult.results.map((s) => ({
    ...s,
    filters: JSON.parse(s.filters) as Record<string, string>,
  }));

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[1080px]">
        <h1 className="mb-4 font-serif text-3xl text-forest-deep">Saved</h1>

        {/* Tab strip */}
        <div className="mb-6 flex gap-4 border-b border-line">
          {(["vans", "searches"] as Tab[]).map((t) => (
            <Link
              key={t}
              href={`/dashboard/saved?tab=${t}`}
              className={cn(
                "-mb-px pb-2.5 pt-1 text-sm font-medium transition-colors",
                tab === t
                  ? "border-b-2 border-forest-deep text-forest-deep"
                  : "border-b-2 border-transparent text-stone hover:text-charcoal",
              )}
            >
              {t === "vans" ? `Vans (${listings.length})` : `Searches (${savedSearches.length})`}
            </Link>
          ))}
        </div>

        {tab === "vans" ? (
          listings.length === 0 ? (
            <div className="cs-card flex flex-col items-center gap-3 py-12 text-center">
              <p className="font-semibold text-charcoal">No saved vans yet</p>
              <p className="max-w-[40ch] text-sm text-stone">Tap the heart on any listing to save it for later.</p>
              <Link href="/vans" className={cn(buttonVariants())}>Browse vans</Link>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )
        ) : (
          <SavedSearches initial={savedSearches} />
        )}
      </div>
    </main>
  );
}

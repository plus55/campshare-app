import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getInstantBookEligibleHosts } from "@/lib/badges";
import ListingCard, { type SearchResult } from "./ListingCard";
import SearchFilters, { type FilterValues } from "./SearchFilters";
import MapViewClient from "./MapViewClient";

interface SearchParams {
  region?: string;
  vanType?: string;
  sleeps?: string;
  minRate?: string;
  maxRate?: string;
  petFriendly?: string;
  instantBook?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
}

export const metadata = {
  title: "Browse Campervans | CampShare",
  description: "Search and hire campervans across New Zealand.",
};

export default async function VansPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [sp, session] = await Promise.all([searchParams, getSession()]);

  const region = sp.region || "";
  const vanType = sp.vanType || "";
  const sleeps = sp.sleeps ? parseInt(sp.sleeps, 10) : null;
  const minRate = sp.minRate ? Math.round(parseFloat(sp.minRate) * 100) : null;
  const maxRate = sp.maxRate ? Math.round(parseFloat(sp.maxRate) * 100) : null;
  const petFriendly = sp.petFriendly === "1";
  const instantBook = sp.instantBook === "1";
  const startMs = sp.startDate ? new Date(sp.startDate).getTime() : null;
  const endMs = sp.endDate ? new Date(sp.endDate).getTime() : null;
  const sort = sp.sort === "rating" ? "rating" : "newest";

  const whereClauses: string[] = ["vl.status = 'published'"];
  const binds: unknown[] = [];

  if (region) { whereClauses.push("vl.region = ?"); binds.push(region); }
  if (vanType) { whereClauses.push("vl.vanType = ?"); binds.push(vanType); }
  if (sleeps !== null) { whereClauses.push("vl.sleeps >= ?"); binds.push(sleeps); }
  if (minRate !== null) { whereClauses.push("vl.nightlyRate >= ?"); binds.push(minRate); }
  if (maxRate !== null) { whereClauses.push("vl.nightlyRate <= ?"); binds.push(maxRate); }
  if (petFriendly) { whereClauses.push("vl.petFriendly = 1"); }
  if (instantBook) { whereClauses.push("vl.instantBook = 1"); }
  if (startMs !== null && endMs !== null) {
    whereClauses.push(
      "NOT EXISTS (SELECT 1 FROM availability_block ab WHERE ab.vanListingId = vl.id AND ab.startDate < ? AND ab.endDate > ?)"
    );
    binds.push(endMs, startMs);
  }

  const sql = `
    SELECT
      vl.id, vl.slug, vl.name, vl.vanType, vl.region, vl.island,
      vl.nightlyRate, vl.sleeps, vl.petFriendly, vl.instantBook, vl.hostUserId,
      vl.minimumNights, vl.pickupLat, vl.pickupLng, vl.pickupLocationText,
      hp.firstName AS hostFirstName,
      u.image      AS hostImage,
      COALESCE(rv.avgRating, NULL) AS avgRating,
      COALESCE(rv.reviewCount, 0) AS reviewCount,
      (SELECT r2Key FROM van_photo
       WHERE vanListingId = vl.id
       ORDER BY position ASC, createdAt ASC LIMIT 1) AS coverPhotoKey
    FROM van_listing vl
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
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY ${sort === "rating"
      ? "COALESCE(rv.avgRating, 0) DESC, COALESCE(rv.reviewCount, 0) DESC, vl.publishedAt DESC"
      : "vl.publishedAt DESC"}
    LIMIT 60
  `;

  const database = await getDb();
  const { results: rawListings } = await database
    .prepare(sql)
    .bind(...binds)
    .all<SearchResult>();

  let savedIds = new Set<string>();
  if (session) {
    const { results: saved } = await database
      .prepare("SELECT vanListingId FROM wishlist WHERE userId = ?")
      .bind(session.user.id)
      .all<{ vanListingId: string }>();
    savedIds = new Set(saved.map((r) => r.vanListingId));
  }

  const ibHostIds = Array.from(new Set(rawListings.filter((l) => l.instantBook).map((l) => l.hostUserId)));
  const eligibleHosts = await getInstantBookEligibleHosts(ibHostIds);
  const gated = rawListings.map((l) => ({
    ...l,
    instantBook: l.instantBook && eligibleHosts.has(l.hostUserId) ? 1 : 0,
  }));
  const filtered = instantBook ? gated.filter((l) => l.instantBook === 1) : gated;
  const listings = filtered.map((l) => ({ ...l, isWishlisted: savedIds.has(l.id) ? 1 : 0 }));

  const initialFilters: FilterValues = {
    region, vanType,
    sleeps: sp.sleeps || "",
    minRate: sp.minRate || "",
    maxRate: sp.maxRate || "",
    petFriendly,
    instantBook,
    startDate: sp.startDate || "",
    endDate: sp.endDate || "",
    sort,
  };

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - var(--header-h))" }}>
      <SearchFilters initial={initialFilters} isLoggedIn={!!session} />
      <div className="flex flex-1 overflow-hidden">
        {/* Listing grid */}
        <div className="flex-[0_0_50%] overflow-y-auto p-4">
          <p className="mb-3 text-xs text-stone">
            {listings.length === 0
              ? "No vans match your filters."
              : `${listings.length} van${listings.length === 1 ? "" : "s"} available`}
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
          {listings.length === 0 && (
            <div className="cs-card mt-4 p-10 text-center">
              <p className="mb-2 font-semibold text-charcoal">No vans found</p>
              <p className="text-xs text-stone">Try removing some filters or check back later — more vans are being added.</p>
            </div>
          )}
        </div>

        {/* Map (hidden on mobile via globals.css cs-search-map) */}
        <div
          className="cs-search-map flex-[0_0_50%] relative border-l border-line"
        >
          <MapViewClient listings={listings} />
        </div>
      </div>
    </div>
  );
}

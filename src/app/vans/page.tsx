import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
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
      vl.nightlyRate, vl.sleeps, vl.petFriendly, vl.instantBook,
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
    ORDER BY vl.publishedAt DESC
    LIMIT 60
  `;

  const { results: rawListings } = await db()
    .prepare(sql)
    .bind(...binds)
    .all<SearchResult>();

  let savedIds = new Set<string>();
  if (session) {
    const { results: saved } = await db()
      .prepare("SELECT vanListingId FROM wishlist WHERE userId = ?")
      .bind(session.user.id)
      .all<{ vanListingId: string }>();
    savedIds = new Set(saved.map((r) => r.vanListingId));
  }
  const listings = rawListings.map((l) => ({ ...l, isWishlisted: savedIds.has(l.id) ? 1 : 0 }));

  const initialFilters: FilterValues = {
    region, vanType,
    sleeps: sp.sleeps || "",
    minRate: sp.minRate || "",
    maxRate: sp.maxRate || "",
    petFriendly,
    instantBook,
    startDate: sp.startDate || "",
    endDate: sp.endDate || "",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - var(--header-h))", overflow: "hidden" }}>
      {/* Filters */}
      <SearchFilters initial={initialFilters} />

      {/* Body: list + map */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* List */}
        <div style={{ flex: "0 0 50%", overflowY: "auto", padding: 16 }}>
          <p className="cs-muted cs-small" style={{ marginBottom: 12 }}>
            {listings.length === 0
              ? "No vans match your filters."
              : `${listings.length} van${listings.length === 1 ? "" : "s"} available`}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
          {listings.length === 0 && (
            <div className="cs-card" style={{ textAlign: "center", padding: 40 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>No vans found</p>
              <p className="cs-muted cs-small">Try removing some filters or check back later — more vans are being added.</p>
            </div>
          )}
        </div>

        {/* Map (hidden on mobile via media query in globals.css) */}
        <div
          className="cs-search-map"
          style={{ flex: "0 0 50%", position: "relative", borderLeft: "1px solid var(--sand-200)" }}
        >
          <MapViewClient listings={listings} />
        </div>
      </div>
    </div>
  );
}

import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getInstantBookEligibleHosts } from "@/lib/badges";
import ListingCard, { type SearchResult } from "@/app/vans/ListingCard";

interface Props {
  region: string;
  excludeId: string;
}

export default async function SimilarListings({ region, excludeId }: Props) {
  const [session, database] = await Promise.all([getSession(), getDb()]);

  const { results: listings } = await database
    .prepare(
      `SELECT
        vl.id, vl.slug, vl.name, vl.vanType, vl.region, vl.island,
        vl.nightlyRate, vl.sleeps, vl.petFriendly, vl.instantBook, vl.hostUserId,
        vl.minimumNights, vl.pickupLat, vl.pickupLng, vl.pickupLocationText,
        hp.firstName AS hostFirstName,
        u.image      AS hostImage,
        COALESCE(rv.avgRating, NULL) AS avgRating,
        COALESCE(rv.reviewCount, 0) AS reviewCount,
        0            AS isWishlisted,
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
       WHERE vl.status = 'published' AND vl.region = ? AND vl.id != ?
       ORDER BY vl.publishedAt DESC
       LIMIT 4`
    )
    .bind(region, excludeId)
    .all<SearchResult>();

  if (listings.length === 0) return null;

  let savedIds = new Set<string>();
  if (session) {
    const { results: saved } = await database
      .prepare("SELECT vanListingId FROM wishlist WHERE userId = ?")
      .bind(session.user.id)
      .all<{ vanListingId: string }>();
    savedIds = new Set(saved.map((r) => r.vanListingId));
  }

  const ibHostIds = Array.from(new Set(listings.filter((l) => l.instantBook).map((l) => l.hostUserId)));
  const eligibleHosts = await getInstantBookEligibleHosts(ibHostIds);
  const enriched = listings.map((l) => ({
    ...l,
    instantBook: l.instantBook && eligibleHosts.has(l.hostUserId) ? 1 : 0,
    isWishlisted: savedIds.has(l.id) ? 1 : 0,
  }));

  return (
    <div className="cs-card mt-4">
      <h2 className="mb-4 font-serif text-xl text-forest-deep">More vans in {region}</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {enriched.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </div>
  );
}

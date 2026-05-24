import Link from "next/link";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getInstantBookEligibleHosts } from "@/lib/badges";
import ListingCard, { type SearchResult } from "@/app/vans/ListingCard";

export default async function FeaturedVans() {
  const database = await getDb();
  const [session, rawResult] = await Promise.all([
    getSession(),
    database
      .prepare(
        `SELECT
          vl.id, vl.slug, vl.name, vl.vanType, vl.region, vl.island,
          vl.nightlyRate, vl.sleeps, vl.petFriendly, vl.instantBook, vl.hostUserId,
          vl.minimumNights, NULL AS pickupLat, NULL AS pickupLng, NULL AS pickupLocationText,
          hp.firstName AS hostFirstName,
          u.image      AS hostImage,
          NULL         AS avgRating,
          0            AS reviewCount,
          0            AS isWishlisted,
          (SELECT r2Key FROM van_photo
           WHERE vanListingId = vl.id
           ORDER BY position ASC, createdAt ASC LIMIT 1) AS coverPhotoKey
         FROM van_listing vl
         LEFT JOIN host_profile hp ON hp.userId = vl.hostUserId
         LEFT JOIN user u          ON u.id      = vl.hostUserId
         WHERE vl.status = 'published'
         ORDER BY vl.publishedAt DESC
         LIMIT 6`
      )
      .all<SearchResult>(),
  ]);

  if (rawResult.results.length === 0) return null;

  let savedIds = new Set<string>();
  if (session) {
    const { results: saved } = await database
      .prepare("SELECT vanListingId FROM wishlist WHERE userId = ?")
      .bind(session.user.id)
      .all<{ vanListingId: string }>();
    savedIds = new Set(saved.map((r) => r.vanListingId));
  }

  const ibHostIds = Array.from(
    new Set(rawResult.results.filter((l) => l.instantBook).map((l) => l.hostUserId))
  );
  const eligibleHosts = await getInstantBookEligibleHosts(ibHostIds);
  const listings = rawResult.results.map((l) => ({
    ...l,
    isWishlisted: savedIds.has(l.id) ? 1 : 0,
    instantBook: l.instantBook && eligibleHosts.has(l.hostUserId) ? 1 : 0,
  }));

  return (
    <section className="py-[clamp(3rem,6vw,5rem)] bg-sand">
      <div className="wrap">
        <div className="mb-[clamp(1.5rem,3vw,2.5rem)] flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-[clamp(1.8rem,3vw,2.4rem)]">Recently listed</h2>
          <Link
            href="/vans"
            className="text-sm font-medium text-clay hover:text-clay-deep transition-colors"
          >
            Browse all vans →
          </Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </div>
    </section>
  );
}

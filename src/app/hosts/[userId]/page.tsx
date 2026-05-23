import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getReviewsForHost } from "@/lib/reviews";
import { getSession } from "@/lib/session";
import ListingCard, { type SearchResult } from "@/app/vans/ListingCard";
import type { HostProfile } from "@/lib/types";
import ReportButton from "@/components/ReportButton";
import HostBadges from "@/components/HostBadges";
import { getBadgesForHost, isInstantBookEligible } from "@/lib/badges";

interface HostWithProfile extends HostProfile {
  userName: string;
  userImage: string | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(rating) ? "text-ochre" : "text-line"}>★</span>
      ))}
    </span>
  );
}

function relDate(createdAt: number): string {
  const diffDays = Math.floor((Date.now() / 1000 - createdAt) / 86400);
  if (diffDays < 1) return "Today";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const database = await getDb();
  const host = await database
    .prepare(`SELECT hp.firstName, hp.lastName FROM host_profile hp WHERE hp.userId = ?`)
    .bind(userId)
    .first<{ firstName: string; lastName: string }>();
  if (!host) return { title: "Host not found — CampShare" };
  return { title: `${host.firstName} ${host.lastName} — CampShare Host` };
}

export default async function HostProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const database = await getDb();

  const host = await database
    .prepare(
      `SELECT hp.*, u.name AS userName, u.image AS userImage
       FROM host_profile hp
       JOIN user u ON u.id = hp.userId
       WHERE hp.userId = ?`
    )
    .bind(userId)
    .first<HostWithProfile>();

  if (!host) notFound();

  const session = await getSession();
  const canReport = !!session && session.user.id !== userId;

  const [reviewSummary, listingsResult, badges, hostIbEligible] = await Promise.all([
    getReviewsForHost(userId),
    database
      .prepare(
        `SELECT
           vl.id, vl.slug, vl.name, vl.vanType, vl.region, vl.island,
           vl.nightlyRate, vl.sleeps, vl.petFriendly, vl.instantBook,
           vl.minimumNights, vl.pickupLat, vl.pickupLng, vl.pickupLocationText,
           hp2.firstName AS hostFirstName,
           u2.image      AS hostImage,
           COALESCE(rv.avgRating, NULL) AS avgRating,
           COALESCE(rv.reviewCount, 0) AS reviewCount,
           0 AS isWishlisted,
           (SELECT r2Key FROM van_photo
            WHERE vanListingId = vl.id
            ORDER BY position ASC, createdAt ASC LIMIT 1) AS coverPhotoKey
         FROM van_listing vl
         JOIN host_profile hp2 ON hp2.userId = vl.hostUserId
         JOIN user u2 ON u2.id = vl.hostUserId
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
         WHERE vl.hostUserId = ? AND vl.status = 'published'
         ORDER BY vl.publishedAt DESC`
      )
      .bind(userId)
      .all<SearchResult>(),
    getBadgesForHost(userId),
    isInstantBookEligible(userId),
  ]);

  const { avgRating, reviewCount, items: reviews } = reviewSummary;
  const listings = listingsResult.results.map((l) => ({
    ...l,
    instantBook: l.instantBook && hostIbEligible ? 1 : 0,
  }));

  const initial = (host.firstName[0] ?? "H").toUpperCase();
  const memberSince = new Date(host.createdAt * 1000).toLocaleDateString("en-NZ", {
    month: "long", year: "numeric", timeZone: "Pacific/Auckland",
  });

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[860px]">

        {/* Host identity card */}
        <div className="mb-6 flex items-start gap-5 rounded-2xl border border-line bg-cream p-6">
          {host.userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={host.userImage}
              alt={host.firstName}
              className="h-20 w-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-forest font-serif text-[2rem] font-medium text-cream">
              {initial}
            </span>
          )}

          <div className="min-w-0">
            <h1 className="mb-1 font-serif text-3xl text-forest-deep">{host.firstName} {host.lastName}</h1>
            <div className="flex flex-wrap items-center gap-3">
              {reviewCount > 0 && avgRating !== null && (
                <span className="flex items-center gap-1.5 text-sm">
                  <StarRating rating={avgRating} />
                  <strong className="ml-0.5">{avgRating.toFixed(1)}</strong>
                  <span className="text-stone">({reviewCount} review{reviewCount !== 1 ? "s" : ""})</span>
                </span>
              )}
              <span className="text-sm text-stone">Member since {memberSince}</span>
            </div>
            {badges.length > 0 && (
              <div className="mt-2">
                <HostBadges badges={badges} />
              </div>
            )}
            {host.bio && (
              <p className="mt-3 text-sm text-stone">{host.bio}</p>
            )}
            {canReport && (
              <div className="mt-3">
                <ReportButton reportedUserId={userId} reportedName={host.firstName} />
              </div>
            )}
          </div>
        </div>

        {/* Listings */}
        {listings.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 font-serif text-xl text-forest-deep">{host.firstName}&apos;s vans</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div>
          <h2 className="mb-4 font-serif text-xl text-forest-deep">Reviews ({reviewCount})</h2>
          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-line bg-cream p-8 text-center">
              <p className="text-stone">No reviews yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-line rounded-2xl border border-line bg-cream">
              {reviews.map((r) => (
                <div key={r.id} className="p-5">
                  <div className="mb-2 flex justify-between">
                    <span className="text-sm font-semibold text-charcoal">{r.authorName}</span>
                    <div className="flex items-center gap-2">
                      <StarRating rating={r.rating} />
                      <span className="text-xs text-stone">{relDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-stone">{r.text}</p>
                  {r.hostResponse && (
                    <div className="mt-3 rounded-lg border-l-2 border-clay bg-sand px-4 py-2.5">
                      <div className="mb-1 text-xs font-semibold text-clay">
                        Host response
                        {r.hostRespondedAt && <span className="ml-1.5 font-normal text-stone">{relDate(r.hostRespondedAt)}</span>}
                      </div>
                      <p className="text-sm leading-snug text-charcoal-soft">{r.hostResponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

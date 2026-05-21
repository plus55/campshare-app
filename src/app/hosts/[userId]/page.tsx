import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { photoUrl } from "@/lib/photos";
import { getReviewsForHost } from "@/lib/reviews";
import ListingCard, { type SearchResult } from "@/app/vans/ListingCard";
import type { HostProfile } from "@/lib/types";

interface HostUser {
  id: string;
  name: string;
  image: string | null;
}

interface HostWithProfile extends HostProfile {
  userName: string;
  userImage: string | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= Math.round(rating) ? "var(--ochre)" : "var(--line)" }}>★</span>
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
  const host = await db()
    .prepare(
      `SELECT hp.firstName, hp.lastName FROM host_profile hp WHERE hp.userId = ?`
    )
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

  const host = await db()
    .prepare(
      `SELECT hp.*, u.name AS userName, u.image AS userImage
       FROM host_profile hp
       JOIN user u ON u.id = hp.userId
       WHERE hp.userId = ?`
    )
    .bind(userId)
    .first<HostWithProfile>();

  if (!host) notFound();

  const [reviewSummary, listingsResult] = await Promise.all([
    getReviewsForHost(userId),
    db()
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
  ]);

  const { avgRating, reviewCount, items: reviews } = reviewSummary;
  const listings = listingsResult.results;

  const initial = (host.firstName[0] ?? "H").toUpperCase();
  const memberSince = new Date(host.createdAt * 1000).toLocaleDateString("en-NZ", {
    month: "long", year: "numeric", timeZone: "Pacific/Auckland",
  });

  return (
    <main className="cs-page">
      <div className="cs-container" style={{ maxWidth: 860 }}>

        {/* Host identity card */}
        <div className="cs-card" style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 24 }}>
          {host.userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={host.userImage}
              alt={host.firstName}
              style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <span style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "var(--forest)", color: "var(--cream)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 500, flexShrink: 0,
            }}>
              {initial}
            </span>
          )}

          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: "0 0 4px" }}>{host.firstName} {host.lastName}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {reviewCount > 0 && avgRating !== null && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14 }}>
                  <StarRating rating={avgRating} />
                  <strong style={{ marginLeft: 2 }}>{avgRating.toFixed(1)}</strong>
                  <span className="cs-muted">({reviewCount} review{reviewCount !== 1 ? "s" : ""})</span>
                </span>
              )}
              {host.verifiedIdentity ? (
                <span className="cs-pill" style={{ background: "var(--cream)", color: "var(--forest)" }}>✓ Verified</span>
              ) : null}
              <span className="cs-muted cs-small">Member since {memberSince}</span>
            </div>
            {host.bio && (
              <p className="cs-muted" style={{ marginTop: 12, marginBottom: 0 }}>{host.bio}</p>
            )}
          </div>
        </div>

        {/* Listings */}
        {listings.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ marginBottom: 16 }}>
              {host.firstName}&apos;s vans
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div>
          <h2 style={{ marginBottom: 16 }}>
            Reviews ({reviewCount})
          </h2>
          {reviews.length === 0 ? (
            <div className="cs-card" style={{ padding: 24, textAlign: "center" }}>
              <p className="cs-muted" style={{ margin: 0 }}>No reviews yet.</p>
            </div>
          ) : (
            <div className="cs-card" style={{ padding: 0 }}>
              {reviews.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    padding: 20,
                    borderTop: i > 0 ? "1px solid var(--line)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.authorName}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StarRating rating={r.rating} />
                      <span className="cs-muted cs-small">{relDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <p className="cs-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{r.text}</p>
                  {r.hostResponse && (
                    <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--sand)", borderRadius: 8, borderLeft: "3px solid var(--clay)" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clay)", marginBottom: 4 }}>
                        Host response
                        {r.hostRespondedAt && <span style={{ fontWeight: 400, color: "var(--stone)", marginLeft: 6 }}>{relDate(r.hostRespondedAt)}</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--charcoal-soft)", lineHeight: 1.5 }}>{r.hostResponse}</p>
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

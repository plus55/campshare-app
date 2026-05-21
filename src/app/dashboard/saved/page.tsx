import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import ListingCard, { type SearchResult } from "@/app/vans/ListingCard";

export const metadata: Metadata = {
  title: "Saved vans — CampShare",
};

export default async function SavedPage() {
  const session = await requireSession();

  const { results: listings } = await db()
    .prepare(
      `SELECT
        vl.id, vl.slug, vl.name, vl.vanType, vl.region, vl.island,
        vl.nightlyRate, vl.sleeps, vl.petFriendly, vl.instantBook,
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
    .all<SearchResult>();

  return (
    <main className="cs-page">
      <div className="cs-container">
        <h1 style={{ marginBottom: 4 }}>Saved vans</h1>
        <p className="cs-muted" style={{ marginBottom: 24 }}>Vans you&apos;ve hearted — tap the heart to unsave.</p>

        {listings.length === 0 ? (
          <div className="cs-card" style={{ textAlign: "center", padding: 48 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>No saved vans yet</p>
            <p className="cs-muted cs-small" style={{ marginBottom: 20 }}>
              Tap the heart on any listing to save it for later.
            </p>
            <Link href="/vans" className="cs-btn cs-btn-primary">Browse vans</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

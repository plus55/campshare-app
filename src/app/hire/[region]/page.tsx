import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { NZ_REGIONS } from "@/lib/constants";
import { slugToRegion, regionToSlug } from "@/lib/regionSlug";
import ListingCard, { type SearchResult } from "@/app/vans/ListingCard";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return NZ_REGIONS.map((r) => ({ region: regionToSlug(r) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region: slug } = await params;
  const region = slugToRegion(slug);
  if (!region) return {};
  return {
    title: `Campervan Hire in ${region} | CampShare`,
    description: `Browse and hire campervans in ${region}, New Zealand. Find the perfect van for your road trip.`,
  };
}

export default async function HirePage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region: slug } = await params;
  const region = slugToRegion(slug);
  if (!region) notFound();

  const { results: listings } = await db()
    .prepare(
      `SELECT
        vl.id, vl.slug, vl.name, vl.vanType, vl.region, vl.island,
        vl.nightlyRate, vl.sleeps, vl.petFriendly, vl.instantBook,
        vl.minimumNights, vl.pickupLat, vl.pickupLng, vl.pickupLocationText,
        (SELECT r2Key FROM van_photo
         WHERE vanListingId = vl.id
         ORDER BY position ASC, createdAt ASC LIMIT 1) AS coverPhotoKey
       FROM van_listing vl
       WHERE vl.status = 'published' AND vl.region = ?
       ORDER BY vl.publishedAt DESC
       LIMIT 60`
    )
    .bind(region)
    .all<SearchResult>();

  const island = listings[0]?.island ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Campervan Hire in ${region}`,
    "numberOfItems": listings.length,
    "itemListElement": listings.map((l, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `https://app.campshare.co.nz/vans/${l.slug}`,
      "name": l.name,
    })),
  };

  return (
    <main className="cs-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="cs-container">
        <a href="/vans" className="cs-muted cs-small" style={{ display: "inline-block", marginBottom: 12 }}>
          ← All campervans
        </a>
        <h1 style={{ marginBottom: 4 }}>Campervan Hire in {region}</h1>
        {island && (
          <p className="cs-muted" style={{ marginBottom: 24 }}>
            {island} Island, New Zealand
          </p>
        )}

        {listings.length === 0 ? (
          <div className="cs-card" style={{ textAlign: "center", padding: 48 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>No vans listed yet in {region}</p>
            <p className="cs-muted cs-small">We&apos;re growing! Check back soon or{" "}
              <a href="/vans">browse all regions</a>.
            </p>
          </div>
        ) : (
          <>
            <p className="cs-muted cs-small" style={{ marginBottom: 16 }}>
              {listings.length} van{listings.length === 1 ? "" : "s"} available
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: 40, borderTop: "1px solid var(--sand-200)", paddingTop: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Browse other regions</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {NZ_REGIONS.filter((r) => r !== region).map((r) => (
              <a key={r} href={`/hire/${regionToSlug(r)}`} className="cs-pill" style={{ textDecoration: "none" }}>
                {r}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

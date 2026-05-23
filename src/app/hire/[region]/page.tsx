import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getInstantBookEligibleHosts } from "@/lib/badges";
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

  const database = await getDb();

  const [session, rawResult] = await Promise.all([
    getSession(),
    database
      .prepare(
        `SELECT
          vl.id, vl.slug, vl.name, vl.vanType, vl.region, vl.island,
          vl.nightlyRate, vl.sleeps, vl.petFriendly, vl.instantBook, vl.hostUserId,
          vl.minimumNights, vl.pickupLat, vl.pickupLng, vl.pickupLocationText,
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
         WHERE vl.status = 'published' AND vl.region = ?
         ORDER BY vl.publishedAt DESC
         LIMIT 60`
      )
      .bind(region)
      .all<SearchResult>(),
  ]);

  let savedIds = new Set<string>();
  if (session) {
    const { results: saved } = await database
      .prepare("SELECT vanListingId FROM wishlist WHERE userId = ?")
      .bind(session.user.id)
      .all<{ vanListingId: string }>();
    savedIds = new Set(saved.map((r) => r.vanListingId));
  }
  const ibHostIds = Array.from(new Set(rawResult.results.filter((l) => l.instantBook).map((l) => l.hostUserId)));
  const eligibleHosts = await getInstantBookEligibleHosts(ibHostIds);
  const listings = rawResult.results.map((l) => ({
    ...l,
    isWishlisted: savedIds.has(l.id) ? 1 : 0,
    instantBook: l.instantBook && eligibleHosts.has(l.hostUserId) ? 1 : 0,
  }));

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
    <main className="min-h-screen px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-[1080px]">
        <h1 className="mb-1 font-serif text-3xl text-forest-deep">Campervan Hire in {region}</h1>
        {island && (
          <p className="mb-6 text-stone">{island} Island, New Zealand</p>
        )}

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-line bg-cream p-12 text-center">
            <p className="mb-2 font-semibold text-charcoal">No vans listed yet in {region}</p>
            <p className="text-sm text-stone">
              We&apos;re growing! Check back soon or{" "}
              <a href="/vans" className="text-forest-deep underline">browse all regions</a>.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-stone">
              {listings.length} van{listings.length === 1 ? "" : "s"} available
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </>
        )}

        <div className="mt-10 border-t border-line pt-6">
          <h2 className="mb-3 text-base font-semibold text-charcoal">Browse other regions</h2>
          <div className="flex flex-wrap gap-2">
            {NZ_REGIONS.filter((r) => r !== region).map((r) => (
              <a
                key={r}
                href={`/hire/${regionToSlug(r)}`}
                className="rounded-full border border-line bg-cream px-3 py-1 text-sm text-charcoal-soft hover:border-forest hover:text-forest transition-colors no-underline"
              >
                {r}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

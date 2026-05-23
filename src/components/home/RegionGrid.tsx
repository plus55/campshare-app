import Link from "next/link";
import { NZ_REGIONS, NORTH_ISLAND_REGIONS } from "@/lib/constants";
import { regionToSlug } from "@/lib/regionSlug";

export default function RegionGrid() {
  const north = NZ_REGIONS.filter((r) => NORTH_ISLAND_REGIONS.has(r));
  const south = NZ_REGIONS.filter((r) => !NORTH_ISLAND_REGIONS.has(r));

  return (
    <section className="bg-sand py-[clamp(3rem,6vw,5rem)]">
      <div className="wrap">
        <div className="mb-[clamp(2rem,4vw,3rem)] text-center">
          <h2 className="mb-3 text-[clamp(1.8rem,3vw,2.4rem)]">Browse by region</h2>
          <p className="mx-auto max-w-[48ch] text-stone">
            From Cape Reinga to Bluff &mdash; pick up a van near your starting point.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-[clamp(2rem,4vw,3rem)] sm:grid-cols-2">
          <div>
            <h3 className="mb-4 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-ochre">
              North Island
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
              {north.map((r) => (
                <Link
                  key={r}
                  href={`/hire/${regionToSlug(r)}`}
                  className="block rounded-[var(--radius)] border border-line bg-cream px-4 py-3 text-[0.9rem] text-forest-deep no-underline transition-colors hover:border-clay/30 hover:bg-sand-100"
                >
                  {r}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-ochre">
              South Island
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
              {south.map((r) => (
                <Link
                  key={r}
                  href={`/hire/${regionToSlug(r)}`}
                  className="block rounded-[var(--radius)] border border-line bg-cream px-4 py-3 text-[0.9rem] text-forest-deep no-underline transition-colors hover:border-clay/30 hover:bg-sand-100"
                >
                  {r}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

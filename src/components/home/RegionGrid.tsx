import Link from "next/link";
import { NZ_REGIONS, NORTH_ISLAND_REGIONS } from "@/lib/constants";
import { regionToSlug } from "@/lib/regionSlug";

export default function RegionGrid() {
  const north = NZ_REGIONS.filter((r) => NORTH_ISLAND_REGIONS.has(r));
  const south = NZ_REGIONS.filter((r) => !NORTH_ISLAND_REGIONS.has(r));

  return (
    <section style={{ padding: "clamp(3rem, 6vw, 5rem) 0", background: "var(--sand)" }}>
      <div className="wrap">
        <div style={{ textAlign: "center", marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", marginBottom: "0.75rem" }}>
            Browse by region
          </h2>
          <p className="cs-muted" style={{ maxWidth: "48ch", margin: "0 auto" }}>
            From Cape Reinga to Bluff &mdash; pick up a van near your starting point.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(2rem, 4vw, 3rem)" }} className="region-grid-island">
          <div>
            <h3 style={{ fontSize: "0.85rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "1rem" }}>
              North Island
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.5rem" }}>
              {north.map((r) => (
                <Link
                  key={r}
                  href={`/hire/${regionToSlug(r)}`}
                  style={{
                    padding: "0.7rem 1rem",
                    background: "var(--cream)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius)",
                    color: "var(--forest-deep)",
                    textDecoration: "none",
                    fontSize: "0.92rem",
                  }}
                >
                  {r}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: "0.85rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "1rem" }}>
              South Island
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.5rem" }}>
              {south.map((r) => (
                <Link
                  key={r}
                  href={`/hire/${regionToSlug(r)}`}
                  style={{
                    padding: "0.7rem 1rem",
                    background: "var(--cream)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius)",
                    color: "var(--forest-deep)",
                    textDecoration: "none",
                    fontSize: "0.92rem",
                  }}
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

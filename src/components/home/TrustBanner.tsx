import { db } from "@/lib/db";

export default async function TrustBanner() {
  const row = await db()
    .prepare(`SELECT count(*) AS n FROM van_listing WHERE status = 'published'`)
    .first<{ n: number }>();
  const count = row?.n ?? 0;

  const items = [
    count > 0 ? `${count} van${count === 1 ? "" : "s"} listed across Aotearoa` : "Vans listed across Aotearoa",
    "Verified Kiwi owners",
    "Secure payment held until your trip ends",
  ];

  return (
    <section style={{
      background: "var(--forest-deep)",
      color: "rgba(250,246,238,0.85)",
      padding: "1rem 0",
      fontSize: "0.92rem",
    }}>
      <div className="wrap" style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "2rem",
        flexWrap: "wrap",
        textAlign: "center",
      }}>
        {items.map((it, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--ochre)" }}>&bull;</span> {it}
          </span>
        ))}
      </div>
    </section>
  );
}

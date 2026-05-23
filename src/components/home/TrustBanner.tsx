import { db } from "@/lib/db";
import { ShieldCheck, Star, Lock } from "lucide-react";

export default async function TrustBanner() {
  const row = await db()
    .prepare(`SELECT count(*) AS n FROM van_listing WHERE status = 'published'`)
    .first<{ n: number }>();
  const count = row?.n ?? 0;

  const reviewRow = await db()
    .prepare(`SELECT ROUND(AVG(rating),1) AS avg, count(*) AS n FROM review`)
    .first<{ avg: number | null; n: number }>();
  const avgRating = reviewRow?.avg ?? null;
  const reviewCount = reviewRow?.n ?? 0;

  const items = [
    {
      icon: <ShieldCheck size={15} />,
      text: count > 0 ? `${count} verified van${count === 1 ? "" : "s"} across Aotearoa` : "Verified campervans across Aotearoa",
    },
    {
      icon: <Star size={15} />,
      text: avgRating && reviewCount > 5
        ? `${avgRating} stars from ${reviewCount} guest reviews`
        : "Real guest reviews on every listing",
    },
    {
      icon: <Lock size={15} />,
      text: "Secure payment — funds held until your trip ends",
    },
  ];

  return (
    <section style={{
      background: "var(--forest-deep)",
      color: "rgba(250,246,238,0.85)",
      padding: "1rem 0",
      fontSize: "0.9rem",
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
            <span style={{ color: "var(--ochre)", display: "flex" }}>{it.icon}</span>
            {it.text}
          </span>
        ))}
      </div>
    </section>
  );
}

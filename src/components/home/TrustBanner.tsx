import { getDb } from "@/lib/db";
import { ShieldCheck, Star, Lock } from "lucide-react";

export default async function TrustBanner() {
  const database = await getDb();

  const row = await database
    .prepare(`SELECT count(*) AS n FROM van_listing WHERE status = 'published'`)
    .first<{ n: number }>();
  const count = row?.n ?? 0;

  const reviewRow = await database
    .prepare(`SELECT ROUND(AVG(rating),1) AS avg, count(*) AS n FROM review`)
    .first<{ avg: number | null; n: number }>();
  const avgRating = reviewRow?.avg ?? null;
  const reviewCount = reviewRow?.n ?? 0;

  const items = [
    {
      icon: <ShieldCheck size={15} />,
      text: count > 0
        ? `${count} verified van${count === 1 ? "" : "s"} across Aotearoa`
        : "Verified campervans across Aotearoa",
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
    <section className="bg-forest-deep py-4 text-[0.9rem] text-cream/85">
      <div className="wrap flex flex-wrap items-center justify-center gap-6 text-center sm:gap-8">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <span className="flex text-ochre">{it.icon}</span>
            {it.text}
          </span>
        ))}
      </div>
    </section>
  );
}

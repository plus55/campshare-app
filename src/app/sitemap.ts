import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { NZ_REGIONS } from "@/lib/constants";
import { regionToSlug } from "@/lib/regionSlug";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";

  const listings = await db()
    .prepare(
      "SELECT slug, publishedAt FROM van_listing WHERE status = 'published' ORDER BY publishedAt DESC"
    )
    .all<{ slug: string; publishedAt: number | null }>();

  const vanPages = listings.results.map((l) => ({
    url: `${base}/vans/${l.slug}`,
    lastModified: l.publishedAt ? new Date(l.publishedAt * 1000) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const hirePages = NZ_REGIONS.map((r) => ({
    url: `${base}/hire/${regionToSlug(r)}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    { url: base, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/vans`, changeFrequency: "daily" as const, priority: 0.9 },
    ...hirePages,
    ...vanPages,
  ];
}

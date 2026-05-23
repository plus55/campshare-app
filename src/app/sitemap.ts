import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { NZ_REGIONS } from "@/lib/constants";
import { regionToSlug } from "@/lib/regionSlug";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";

  const [listings, hosts] = await Promise.all([
    db()
      .prepare(
        "SELECT slug, publishedAt FROM van_listing WHERE status = 'published' ORDER BY publishedAt DESC"
      )
      .all<{ slug: string; publishedAt: number | null }>(),
    db()
      .prepare(
        "SELECT DISTINCT userId FROM van_listing WHERE status = 'published'"
      )
      .all<{ userId: string }>(),
  ]);

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

  const hostPages = hosts.results.map((h) => ({
    url: `${base}/hosts/${h.userId}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [
    { url: base, changeFrequency: "monthly" as const, priority: 1.0 },
    { url: `${base}/vans`, changeFrequency: "daily" as const, priority: 0.9 },
    ...hirePages,
    ...vanPages,
    ...hostPages,
  ];
}

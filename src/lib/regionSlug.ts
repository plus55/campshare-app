import { NZ_REGIONS } from "./constants";

export function regionToSlug(region: string): string {
  return region.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function slugToRegion(slug: string): string | null {
  return NZ_REGIONS.find((r) => regionToSlug(r) === slug) ?? null;
}

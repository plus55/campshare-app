import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import type { VanListing } from "@/lib/types";
import AddonsManager from "./AddonsManager";

interface AddonRow {
  id: string;
  name: string;
  description: string | null;
  priceType: "flat" | "per_night";
  sortOrder: number;
}

interface ListingAddonRow extends AddonRow {
  priceNZDCents: number;
}

export default async function AddonsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const database = await getDb();

  const listing = await database
    .prepare("SELECT id, name FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<Pick<VanListing, "id" | "name">>();

  if (!listing) notFound();

  const [catalogue, enabled] = await Promise.all([
    database
      .prepare("SELECT id, name, description, priceType, sortOrder FROM addon WHERE active = 1 ORDER BY sortOrder")
      .all<AddonRow>(),
    database
      .prepare(
        `SELECT a.id, a.name, a.description, a.priceType, a.sortOrder, la.priceNZDCents
         FROM listing_addon la
         JOIN addon a ON a.id = la.addonId
         WHERE la.vanListingId = ?`
      )
      .bind(id)
      .all<ListingAddonRow>(),
  ]);

  const enabledMap = new Map(enabled.results.map((e) => [e.id, e.priceNZDCents]));

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[720px]">
        <p className="mb-2 text-sm">
          <Link href={`/dashboard/listings/${id}`} className="text-muted-foreground hover:text-foreground">
            ← {listing.name}
          </Link>
        </p>
        <h1 className="mb-1 font-serif text-3xl text-forest-deep dark:text-cream">Add-ons</h1>
        <p className="mb-6 text-muted-foreground">
          Choose which add-ons guests can request with this van. You set the price — we pass it through to you in full.
        </p>
        <AddonsManager
          listingId={id}
          catalogue={catalogue.results}
          enabledMap={Object.fromEntries(enabledMap)}
        />
      </div>
    </main>
  );
}

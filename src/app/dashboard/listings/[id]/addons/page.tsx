import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
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

  const listing = await db()
    .prepare("SELECT id, name FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<Pick<VanListing, "id" | "name">>();

  if (!listing) notFound();

  const [catalogue, enabled] = await Promise.all([
    db()
      .prepare("SELECT id, name, description, priceType, sortOrder FROM addon WHERE active = 1 ORDER BY sortOrder")
      .all<AddonRow>(),
    db()
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
    <main className="cs-page">
      <div className="cs-narrow">
        <h1>{listing.name} — Add-ons</h1>
        <p className="cs-muted" style={{ marginTop: 0, marginBottom: 24 }}>
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

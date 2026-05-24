import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import type { VanListing } from "@/lib/types";
import ListingForm from "../ListingForm";
import ListingActions from "./ListingActions";

const statusBadge: Record<string, string> = {
  draft:          "rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground",
  pending_review: "rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground",
  published:      "rounded-full bg-moss/10 px-2.5 py-0.5 text-[11px] font-medium text-moss",
  paused:         "rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground",
  rejected:       "rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium text-destructive",
  archived:       "rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const database = await getDb();

  const listing = await database
    .prepare("SELECT * FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<VanListing>();

  if (!listing) notFound();

  const statusLabel = listing.status === "pending_review" ? "in review" : listing.status;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[720px]">
        <p className="mb-2 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">← Dashboard</Link>
        </p>

        <div className="mb-4 flex items-center gap-3">
          <h1 className="m-0 font-serif text-3xl text-forest-deep dark:text-cream">{listing.name}</h1>
          <span className={statusBadge[listing.status] ?? statusBadge.draft}>{statusLabel}</span>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Link href={`/dashboard/listings/${id}/photos`} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
            Photos
          </Link>
          <Link href={`/dashboard/listings/${id}/calendar`} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
            Calendar
          </Link>
          <Link href={`/dashboard/listings/${id}/addons`} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
            Add-ons
          </Link>
          {listing.status === "published" && (
            <Link href={`/vans/${listing.slug}`} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors" target="_blank">
              View public page ↗
            </Link>
          )}
        </div>

        {listing.status === "pending_review" ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-muted-foreground">
              This listing is under review. You can&apos;t edit it until the review is complete.
            </p>
            {listing.adminNote && (
              <p className="mt-2 text-sm text-muted-foreground">
                <strong className="text-foreground">Admin note:</strong> {listing.adminNote}
              </p>
            )}
          </div>
        ) : (
          <ListingForm listing={listing} />
        )}

        <div className="mt-4">
          <ListingActions listing={listing} />
        </div>
      </div>
    </main>
  );
}

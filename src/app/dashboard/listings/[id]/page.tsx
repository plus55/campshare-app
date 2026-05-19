import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { VanListing } from "@/lib/types";
import ListingForm from "../ListingForm";
import ListingActions from "./ListingActions";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const listing = await db()
    .prepare("SELECT * FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<VanListing>();

  if (!listing) notFound();

  return (
    <main className="cs-page">
      <div className="cs-narrow">
        <Link href="/dashboard" className="cs-small">← Dashboard</Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <h1 style={{ margin: 0 }}>{listing.name}</h1>
          <span className={`cs-pill cs-pill-${listing.status === "pending_review" ? "pending" : listing.status}`}>
            {listing.status === "pending_review" ? "in review" : listing.status}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <Link href={`/dashboard/listings/${id}/photos`} className="cs-btn cs-btn-ghost">
            Photos
          </Link>
          <Link href={`/dashboard/listings/${id}/calendar`} className="cs-btn cs-btn-ghost">
            Calendar
          </Link>
          {listing.status === "published" && (
            <Link href={`/vans/${listing.slug}`} className="cs-btn cs-btn-ghost" target="_blank">
              View public page ↗
            </Link>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          {listing.status === "pending_review" ? (
            <div className="cs-card">
              <p className="cs-muted">
                This listing is under review. You can&apos;t edit it until the review is complete.
              </p>
              {listing.adminNote && (
                <p className="cs-small">
                  <strong>Admin note:</strong> {listing.adminNote}
                </p>
              )}
            </div>
          ) : (
            <ListingForm listing={listing} />
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <ListingActions listing={listing} />
        </div>
      </div>
    </main>
  );
}

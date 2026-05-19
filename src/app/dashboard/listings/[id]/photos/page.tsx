import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { VanListing, VanPhoto } from "@/lib/types";
import PhotoManager from "./PhotoManager";

export default async function ListingPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const listing = await db()
    .prepare("SELECT id, name, hostUserId FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<Pick<VanListing, "id" | "name" | "hostUserId">>();

  if (!listing) notFound();

  const photos = await db()
    .prepare("SELECT * FROM van_photo WHERE vanListingId = ? ORDER BY position ASC, createdAt ASC")
    .bind(id)
    .all<VanPhoto>();

  return (
    <main className="cs-page">
      <div className="cs-narrow">
        <Link href={`/dashboard/listings/${id}`} className="cs-small">
          ← {listing.name}
        </Link>
        <h1 style={{ marginTop: 12 }}>Photos</h1>
        <p className="cs-muted">
          Up to 10 photos. Drag to reorder. First photo is used as the cover image.
        </p>
        <div style={{ marginTop: 24 }}>
          <PhotoManager listingId={id} initialPhotos={photos.results} />
        </div>
      </div>
    </main>
  );
}

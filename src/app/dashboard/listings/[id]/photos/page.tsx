import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import type { VanListing, VanPhoto } from "@/lib/types";
import PhotoManager from "./PhotoManager";

export default async function ListingPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const database = await getDb();

  const listing = await database
    .prepare("SELECT id, name, hostUserId FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(id, session.user.id)
    .first<Pick<VanListing, "id" | "name" | "hostUserId">>();

  if (!listing) notFound();

  const photos = await database
    .prepare("SELECT * FROM van_photo WHERE vanListingId = ? ORDER BY position ASC, createdAt ASC")
    .bind(id)
    .all<VanPhoto>();

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[720px]">
        <p className="mb-2 text-sm">
          <Link href={`/dashboard/listings/${id}`} className="text-muted-foreground hover:text-foreground">
            ← {listing.name}
          </Link>
        </p>
        <h1 className="mb-1 font-serif text-3xl text-forest-deep dark:text-cream">Photos</h1>
        <p className="mb-6 text-muted-foreground">
          Up to 10 photos. Drag to reorder. First photo is used as the cover image.
        </p>
        <PhotoManager listingId={id} initialPhotos={photos.results} />
      </div>
    </main>
  );
}

import Link from "next/link";
import { photoUrl } from "@/lib/photos";
import WishlistHeart from "@/components/WishlistHeart";
import { fmtNzd } from "@/lib/money";

export interface SearchResult {
  id: string;
  slug: string;
  name: string;
  vanType: string;
  region: string;
  island: string;
  nightlyRate: number;
  sleeps: number;
  petFriendly: number;
  instantBook: number;
  hostUserId: string;
  minimumNights: number;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupLocationText: string | null;
  coverPhotoKey: string | null;
  hostFirstName: string | null;
  hostImage: string | null;
  avgRating: number | null;
  reviewCount: number;
  isWishlisted?: number;
}

function HostAvatar({ image, firstName }: { image: string | null; firstName: string | null }) {
  const initial = (firstName?.[0] ?? "?").toUpperCase();
  if (image) {
    return (
      <img
        src={image}
        alt={firstName ?? "Host"}
        className="size-6 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-forest font-serif text-[11px] font-medium text-cream">
      {initial}
    </span>
  );
}

export default function ListingCard({ listing }: { listing: SearchResult }) {
  const priceNzd = fmtNzd(listing.nightlyRate);
  const imgUrl = listing.coverPhotoKey ? photoUrl(listing.coverPhotoKey) : null;
  const hostName = listing.hostFirstName ?? "Host";

  return (
    <div className="relative transition-transform hover:-translate-y-0.5">
      <WishlistHeart
        vanListingId={listing.id}
        initialSaved={!!listing.isWishlisted}
        className="absolute right-2.5 top-2.5 z-10"
      />
      <Link href={`/vans/${listing.slug}`} className="block no-underline">
        <div className="surface-card cursor-pointer overflow-hidden p-0">
          <div className="aspect-[4/3] overflow-hidden bg-sand">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={listing.name}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-stone">
                No photo yet
              </div>
            )}
          </div>
          <div className="px-3.5 py-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <HostAvatar image={listing.hostImage} firstName={listing.hostFirstName} />
                <span className="truncate text-xs text-stone">{hostName}</span>
              </div>
              <div className="shrink-0 text-[15px] font-bold text-charcoal">
                {priceNzd}<span className="text-xs font-normal text-stone">/night</span>
              </div>
            </div>
            <div className="text-[15px] font-semibold leading-snug text-charcoal">{listing.name}</div>
            <div className="mt-1 text-xs text-stone">
              {listing.region} · {listing.island} Island · Sleeps {listing.sleeps}
            </div>
            {listing.reviewCount > 0 && listing.avgRating !== null && (
              <div className="mt-1.5 text-xs text-charcoal-soft">
                <span className="text-ochre">★</span>{" "}
                <span className="font-semibold">{listing.avgRating.toFixed(1)}</span>{" "}
                <span className="text-stone">({listing.reviewCount})</span>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="inline-block rounded-full bg-sand-warm px-2.5 py-0.5 text-[11px] font-medium capitalize text-charcoal-soft">
                {listing.vanType}
              </span>
              {listing.petFriendly ? (
                <span className="inline-block rounded-full bg-sand-warm px-2.5 py-0.5 text-[11px] font-medium text-charcoal-soft">
                  Pets welcome
                </span>
              ) : null}
              {listing.instantBook ? (
                <span className="inline-block rounded-full bg-moss-light px-2.5 py-0.5 text-[11px] font-medium text-moss">
                  Instant book
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

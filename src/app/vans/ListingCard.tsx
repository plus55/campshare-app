import Link from "next/link";
import { photoUrl } from "@/lib/photos";
import WishlistHeart from "@/components/WishlistHeart";

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
        style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <span style={{
      width: 24, height: 24, borderRadius: "50%",
      background: "var(--forest)", color: "var(--cream)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontFamily: "var(--font-serif)", fontWeight: 500,
      flexShrink: 0,
    }}>
      {initial}
    </span>
  );
}

export default function ListingCard({ listing }: { listing: SearchResult }) {
  const priceNzd = Math.round(listing.nightlyRate / 100);
  const imgUrl = listing.coverPhotoKey ? photoUrl(listing.coverPhotoKey) : null;
  const hostName = listing.hostFirstName ?? "Host";

  return (
    <div className="listing-card-wrap" style={{ position: "relative" }}>
      <WishlistHeart
        vanListingId={listing.id}
        initialSaved={!!listing.isWishlisted}
        style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}
      />
      <Link href={`/vans/${listing.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div className="cs-card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}>
        <div style={{
          aspectRatio: "4/3",
          background: "var(--sand-100)",
          overflow: "hidden",
        }}>
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={listing.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--ink-400)", fontSize: 13,
            }}>
              No photo yet
            </div>
          )}
        </div>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <HostAvatar image={listing.hostImage} firstName={listing.hostFirstName} />
              <span className="cs-muted cs-small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {hostName}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>
              ${priceNzd}<span className="cs-muted" style={{ fontWeight: 400, fontSize: 12 }}>/night</span>
            </div>
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{listing.name}</div>
          <div className="cs-muted cs-small" style={{ marginTop: 4 }}>
            {listing.region} · {listing.island} Island · Sleeps {listing.sleeps}
          </div>
          {listing.reviewCount > 0 && listing.avgRating !== null && (
            <div className="cs-small" style={{ marginTop: 6, color: "var(--ink-700)" }}>
              <span style={{ color: "var(--ochre)" }}>★</span>{" "}
              <span style={{ fontWeight: 600 }}>{listing.avgRating.toFixed(1)}</span>{" "}
              <span className="cs-muted">({listing.reviewCount})</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <span className="cs-pill">{listing.vanType}</span>
            {listing.petFriendly ? <span className="cs-pill">Pets welcome</span> : null}
            {listing.instantBook ? <span className="cs-pill">Instant book</span> : null}
          </div>
        </div>
      </div>
    </Link>
    </div>
  );
}

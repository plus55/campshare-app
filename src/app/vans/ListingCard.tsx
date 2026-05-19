import Link from "next/link";
import { photoUrl } from "@/lib/photos";

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
  minimumNights: number;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupLocationText: string | null;
  coverPhotoKey: string | null;
}

export default function ListingCard({ listing }: { listing: SearchResult }) {
  const priceNzd = Math.round(listing.nightlyRate / 100);
  const imgUrl = listing.coverPhotoKey ? photoUrl(listing.coverPhotoKey) : null;

  return (
    <Link href={`/vans/${listing.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{listing.name}</div>
            <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>
              ${priceNzd}<span className="cs-muted" style={{ fontWeight: 400, fontSize: 12 }}>/night</span>
            </div>
          </div>
          <div className="cs-muted cs-small" style={{ marginTop: 4 }}>
            {listing.region} · {listing.island} Island · Sleeps {listing.sleeps}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <span className="cs-pill">{listing.vanType}</span>
            {listing.petFriendly ? <span className="cs-pill">Pets welcome</span> : null}
            {listing.instantBook ? <span className="cs-pill">Instant book</span> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

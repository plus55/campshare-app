import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { photoUrl } from "@/lib/photos";
import type { AvailabilityBlock, VanListing, VanPhoto } from "@/lib/types";

interface ListingWithHost extends VanListing {
  hostFirstName: string;
  hostBio: string | null;
}

async function getListing(slug: string): Promise<ListingWithHost | null> {
  return db()
    .prepare(
      `SELECT vl.*, hp.firstName AS hostFirstName, hp.bio AS hostBio
       FROM van_listing vl
       JOIN host_profile hp ON hp.userId = vl.hostUserId
       WHERE vl.slug = ? AND vl.status = 'published'`
    )
    .bind(slug)
    .first<ListingWithHost>();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) return { title: "Not found" };

  return {
    title: `${listing.name} — CampShare`,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.name,
      description: listing.description.slice(0, 160),
      siteName: "CampShare",
    },
  };
}

export default async function VanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) notFound();

  const photos = await db()
    .prepare("SELECT * FROM van_photo WHERE vanListingId = ? ORDER BY position ASC, createdAt ASC")
    .bind(listing.id)
    .all<VanPhoto>();

  const blocks = await db()
    .prepare("SELECT * FROM availability_block WHERE vanListingId = ? ORDER BY startDate ASC")
    .bind(listing.id)
    .all<AvailabilityBlock>();

  let features: string[] = [];
  try { features = JSON.parse(listing.features) as string[]; } catch { features = []; }

  const coverPhoto = photos.results[0];
  const nightlyDollars = Math.round(listing.nightlyRate / 100);

  return (
    <main className="cs-page">
      <div className="cs-container">
        <span className="cs-brand">CampShare</span>

        {/* Hero photo */}
        {coverPhoto && photoUrl(coverPhoto.r2Key) && (
          <div style={{ margin: "16px 0", borderRadius: 12, overflow: "hidden", aspectRatio: "16/9", maxHeight: 480 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl(coverPhoto.r2Key)}
              alt={listing.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "flex-start", marginTop: 16 }}>
          <h1 style={{ margin: 0 }}>{listing.name}</h1>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 20 }}>${nightlyDollars}<span className="cs-muted" style={{ fontWeight: 400, fontSize: 14 }}>/night</span></p>
            <p className="cs-muted cs-small" style={{ margin: 0 }}>min {listing.minimumNights} night{listing.minimumNights !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
          <span className="cs-pill">{listing.vanType}</span>
          <span className="cs-pill">{listing.region} · {listing.island} Island</span>
          <span className="cs-pill">Sleeps {listing.sleeps}</span>
          {listing.petFriendly ? <span className="cs-pill">Pets welcome</span> : null}
          {listing.instantBook ? <span className="cs-pill">Instant book</span> : null}
        </div>

        {/* Photo gallery */}
        {photos.results.length > 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, marginTop: 16 }}>
            {photos.results.slice(1).map((p) => {
              const url = photoUrl(p.r2Key);
              return url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={url} alt={p.caption ?? ""} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 8 }} />
              ) : null;
            })}
          </div>
        )}

        <div className="cs-card" style={{ marginTop: 24 }}>
          <h2>About this van</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{listing.description}</p>
        </div>

        {features.length > 0 && (
          <div className="cs-card" style={{ marginTop: 16 }}>
            <h2>Features</h2>
            <div className="cs-tags">
              {features.map((f) => <span key={f} className="cs-tag is-active">{f}</span>)}
            </div>
          </div>
        )}

        {listing.houseRules && (
          <div className="cs-card" style={{ marginTop: 16 }}>
            <h2>House rules</h2>
            <p className="cs-muted" style={{ whiteSpace: "pre-wrap" }}>{listing.houseRules}</p>
          </div>
        )}

        {blocks.results.length > 0 && (
          <div className="cs-card" style={{ marginTop: 16 }}>
            <h2>Availability</h2>
            <ReadOnlyCalendar blocks={blocks.results} />
          </div>
        )}

        <div className="cs-card" style={{ marginTop: 16 }}>
          <h2>About the host</h2>
          <p style={{ fontWeight: 500 }}>{listing.hostFirstName}</p>
          {listing.hostBio && <p className="cs-muted">{listing.hostBio}</p>}
        </div>

        <div className="cs-card" style={{ marginTop: 16, textAlign: "center" }}>
          <p className="cs-muted">Booking coming soon — check back shortly.</p>
        </div>

        <p className="cs-muted cs-small" style={{ marginTop: 24, textAlign: "center" }}>
          <a href="https://www.campshare.co.nz">campshare.co.nz</a>
        </p>
      </div>
    </main>
  );
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function ReadOnlyCalendar({ blocks }: { blocks: AvailabilityBlock[] }) {
  const today = new Date();
  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  function isBlocked(ts: number) {
    return blocks.some((b) => ts >= b.startDate && ts <= b.endDate);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {months.map(({ year, month }) => {
        const first = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDow = first.getDay();

        return (
          <div key={`${year}-${month}`}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>{MONTHS[month]} {year}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {DAYS.map((d) => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, color: "var(--clay)", paddingBottom: 4 }}>{d}</div>
              ))}
              {Array.from({ length: firstDow }).map((_, i) => <div key={`p-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const ts = Date.UTC(year, month, i + 1);
                const blocked = isBlocked(ts);
                const isPast = new Date(year, month, i + 1) < today;
                return (
                  <div
                    key={ts}
                    style={{
                      padding: "6px 2px",
                      textAlign: "center",
                      fontSize: 13,
                      border: "1px solid var(--sand-200)",
                      borderRadius: 4,
                      background: blocked ? "var(--clay)" : isPast ? "transparent" : "var(--sand-100)",
                      color: blocked ? "#fff8ef" : isPast ? "var(--sand-300)" : "inherit",
                    }}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

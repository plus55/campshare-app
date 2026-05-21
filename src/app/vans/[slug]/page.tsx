import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { photoUrl } from "@/lib/photos";
import type { AvailabilityBlock, VanListing, VanPhoto } from "@/lib/types";
import Link from "next/link";
import { BookingRequestForm } from "./BookingRequestForm";
import PhotoGalleryLightbox from "./PhotoGalleryLightbox";
import ListingReviews from "./ListingReviews";
import PickupMapClient from "./PickupMapClient";
import SimilarListings from "./SimilarListings";
import StickyBookCta from "./StickyBookCta";
import ShareButton from "./ShareButton";
import WishlistHeart from "@/components/WishlistHeart";
import { getReviewsForListing } from "@/lib/reviews";

interface ListingWithHost extends VanListing {
  hostFirstName: string;
  hostBio: string | null;
  hostImage: string | null;
}

async function getListing(slug: string): Promise<ListingWithHost | null> {
  return db()
    .prepare(
      `SELECT vl.*, hp.firstName AS hostFirstName, hp.bio AS hostBio, u.image AS hostImage
       FROM van_listing vl
       JOIN host_profile hp ON hp.userId = vl.hostUserId
       LEFT JOIN user u ON u.id = vl.hostUserId
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
  const [listing, session] = await Promise.all([getListing(slug), getSession()]);
  if (!listing) notFound();

  const isOwner = session?.user.id === listing.hostUserId;
  const isLoggedIn = !!session;

  const [photosResult, blocksResult, wishlistRow] = await Promise.all([
    db()
      .prepare("SELECT * FROM van_photo WHERE vanListingId = ? ORDER BY position ASC, createdAt ASC")
      .bind(listing.id)
      .all<VanPhoto>(),
    db()
      .prepare("SELECT * FROM availability_block WHERE vanListingId = ? ORDER BY startDate ASC")
      .bind(listing.id)
      .all<AvailabilityBlock>(),
    session && !isOwner
      ? db()
          .prepare("SELECT 1 FROM wishlist WHERE userId = ? AND vanListingId = ?")
          .bind(session.user.id, listing.id)
          .first()
      : Promise.resolve(null),
  ]);

  const userWishlisted = !!wishlistRow;

  let features: string[] = [];
  try { features = JSON.parse(listing.features) as string[]; } catch { features = []; }

  const nightlyDollars = Math.round(listing.nightlyRate / 100);

  const galleryPhotos = photosResult.results
    .map((p) => {
      const url = photoUrl(p.r2Key);
      return url ? { url, alt: p.caption ?? listing.name } : null;
    })
    .filter((p): p is { url: string; alt: string } => p !== null);

  return (
    <main className="cs-page" style={{ paddingBottom: 80 }}>
      <div className="cs-container">

        {/* Title + actions */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, margin: "20px 0 10px" }}>
          <h1 style={{ margin: 0 }}>{listing.name}</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <ShareButton title={listing.name} />
            {!isOwner && (
              <WishlistHeart vanListingId={listing.id} initialSaved={userWishlisted} />
            )}
          </div>
        </div>

        {/* Info pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <span className="cs-pill">{listing.vanType}</span>
          <span className="cs-pill">{listing.region} · {listing.island} Island</span>
          <span className="cs-pill">Sleeps {listing.sleeps}</span>
          {listing.petFriendly ? <span className="cs-pill">Pets welcome</span> : null}
          {listing.instantBook ? <span className="cs-pill">Instant book</span> : null}
        </div>

        {/* Photo gallery / lightbox */}
        <PhotoGalleryLightbox photos={galleryPhotos} />

        {/* Two-column content */}
        <div className="pdp-grid" style={{ marginTop: 32 }}>

          {/* LEFT — scrollable content */}
          <div>
            <div className="cs-card">
              <h2>About this van</h2>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{listing.description}</p>
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
                <p className="cs-muted" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{listing.houseRules}</p>
              </div>
            )}

            {blocksResult.results.length > 0 && (
              <div className="cs-card" style={{ marginTop: 16 }}>
                <h2>Availability</h2>
                <ReadOnlyCalendar blocks={blocksResult.results} />
              </div>
            )}

            {listing.pickupLat && listing.pickupLng && (
              <div className="cs-card" style={{ marginTop: 16 }}>
                <h2>Pickup area</h2>
                <p className="cs-muted cs-small" style={{ marginBottom: 12 }}>
                  Exact pickup location shared after booking is confirmed.
                </p>
                <PickupMapClient lat={listing.pickupLat} lng={listing.pickupLng} />
              </div>
            )}

            <ListingReviews listingId={listing.id} />

            <SimilarListings region={listing.region} excludeId={listing.id} />

            <div className="cs-card" style={{ marginTop: 16 }}>
              <h2>About the host</h2>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: listing.hostBio ? 12 : 0 }}>
                {listing.hostImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.hostImage}
                    alt={listing.hostFirstName}
                    style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <span style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: "var(--forest)", color: "var(--cream)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, flexShrink: 0,
                  }}>
                    {listing.hostFirstName[0].toUpperCase()}
                  </span>
                )}
                <div>
                  <span style={{ fontWeight: 600, fontSize: 17, display: "block" }}>{listing.hostFirstName}</span>
                  <Link href={`/hosts/${listing.hostUserId}`} className="cs-muted cs-small" style={{ textDecoration: "underline" }}>
                    View host profile
                  </Link>
                </div>
              </div>
              {listing.hostBio && <p className="cs-muted" style={{ margin: 0 }}>{listing.hostBio}</p>}
            </div>
          </div>

          {/* RIGHT — sticky booking widget */}
          <div className="pdp-right">
            <div className="cs-card" id="book-form">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>
                  ${nightlyDollars}
                  <span className="cs-muted" style={{ fontWeight: 400, fontSize: 14 }}>/night</span>
                </p>
                <p className="cs-muted cs-small" style={{ margin: 0 }}>
                  min {listing.minimumNights} night{listing.minimumNights !== 1 ? "s" : ""}
                </p>
              </div>

              {isOwner ? (
                <p className="cs-muted">This is your listing.</p>
              ) : isLoggedIn ? (
                <BookingRequestForm
                  listingId={listing.id}
                  nightlyRateCents={listing.nightlyRate}
                  minimumNights={listing.minimumNights}
                />
              ) : (
                <div style={{ textAlign: "center" }}>
                  <p className="cs-muted" style={{ marginBottom: 16 }}>Sign in to request a booking.</p>
                  <a href="/login" className="cs-btn cs-btn-primary">Sign in to book</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA — hidden on desktop via .pdp-sticky-cta CSS */}
      {!isOwner && <StickyBookCta nightlyRateCents={listing.nightlyRate} />}
    </main>
  );
}

// ── Read-only availability calendar ─────────────────────────────────────────

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

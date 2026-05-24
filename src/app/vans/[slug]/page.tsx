import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { photoUrl } from "@/lib/photos";
import type { AvailabilityBlock, VanListing, VanPhoto } from "@/lib/types";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BookingRequestForm, type ListingAddon } from "./BookingRequestForm";
import PhotoGalleryLightbox from "./PhotoGalleryLightbox";
import ListingReviews from "./ListingReviews";
import PickupMapClient from "./PickupMapClient";
import SimilarListings from "./SimilarListings";
import StickyBookCta from "./StickyBookCta";
import ShareButton from "./ShareButton";
import WishlistHeart from "@/components/WishlistHeart";
import HostBadges from "@/components/HostBadges";
import { getBadgesForHost, isInstantBookEligible } from "@/lib/badges";
import { REGION_COORDS } from "@/lib/constants";

interface ListingWithHost extends VanListing {
  hostFirstName: string;
  hostBio: string | null;
  hostImage: string | null;
}

async function getListing(slug: string): Promise<ListingWithHost | null> {
  const database = await getDb();
  return database
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
  const database = await getDb();

  const kycRow = session
    ? await database
        .prepare("SELECT kycStatus FROM user WHERE id = ?")
        .bind(session.user.id)
        .first<{ kycStatus: "unverified" | "pending" | "verified" | "failed" }>()
    : null;
  const kycStatus = kycRow?.kycStatus ?? "unverified";

  const [photosResult, blocksResult, wishlistRow, addonsResult, hostBadges, hostIbEligible] = await Promise.all([
    database
      .prepare("SELECT * FROM van_photo WHERE vanListingId = ? ORDER BY position ASC, createdAt ASC")
      .bind(listing.id)
      .all<VanPhoto>(),
    database
      .prepare("SELECT * FROM availability_block WHERE vanListingId = ? ORDER BY startDate ASC")
      .bind(listing.id)
      .all<AvailabilityBlock>(),
    session && !isOwner
      ? database
          .prepare("SELECT 1 FROM wishlist WHERE userId = ? AND vanListingId = ?")
          .bind(session.user.id, listing.id)
          .first()
      : Promise.resolve(null),
    database
      .prepare(
        `SELECT la.addonId, a.name, a.description, la.priceNZDCents, a.priceType
         FROM listing_addon la
         JOIN addon a ON a.id = la.addonId
         WHERE la.vanListingId = ? AND a.active = 1
         ORDER BY a.sortOrder`
      )
      .bind(listing.id)
      .all<ListingAddon>(),
    getBadgesForHost(listing.hostUserId),
    isInstantBookEligible(listing.hostUserId),
  ]);

  const userWishlisted = !!wishlistRow;
  const effectiveInstantBook = !!listing.instantBook && hostIbEligible;

  let features: string[] = [];
  try { features = JSON.parse(listing.features) as string[]; } catch { features = []; }

  const nightlyDollars = Math.round(listing.nightlyRate / 100);
  const publicPickupCoords = REGION_COORDS[listing.region];

  const galleryPhotos = photosResult.results
    .map((p) => {
      const url = photoUrl(p.r2Key);
      return url ? { url, alt: p.caption ?? listing.name } : null;
    })
    .filter((p): p is { url: string; alt: string } => p !== null);

  const pill = "inline-block rounded-full bg-sand-warm px-3 py-1 text-xs font-medium text-charcoal-soft";
  const pillMoss = "inline-block rounded-full bg-moss-light px-3 py-1 text-xs font-medium text-moss";

  return (
    <main className="min-h-screen pb-20 pt-6">
      <div className="mx-auto max-w-[1080px] px-4">

        {/* Title + actions */}
        <div className="mb-2.5 mt-5 flex items-start justify-between gap-3">
          <h1 className="m-0 font-serif text-2xl text-forest-deep sm:text-3xl">{listing.name}</h1>
          <div className="flex shrink-0 items-center gap-2">
            <ShareButton title={listing.name} />
            {!isOwner && (
              <WishlistHeart vanListingId={listing.id} initialSaved={userWishlisted} />
            )}
          </div>
        </div>

        {/* Info pills */}
        <div className="mb-5 flex flex-wrap gap-2">
          <span className={pill}>{listing.vanType}</span>
          <span className={pill}>{listing.region} · {listing.island} Island</span>
          <span className={pill}>Sleeps {listing.sleeps}</span>
          {listing.petFriendly ? <span className={pill}>Pets welcome</span> : null}
          {effectiveInstantBook ? <span className={pillMoss}>Instant book</span> : null}
          {listing.minDriverAge > 18 ? <span className={pill}>Drivers {listing.minDriverAge}+</span> : null}
        </div>

        <PhotoGalleryLightbox photos={galleryPhotos} />

        {/* Two-column PDP layout (pdp-grid from globals.css handles responsive) */}
        <div className="pdp-grid mt-8">

          {/* LEFT */}
          <div className="flex flex-col gap-4">
            <div className="surface-card">
              <h2 className="mb-3 font-serif text-xl text-forest-deep">About this van</h2>
              <p className="m-0 whitespace-pre-wrap text-charcoal-soft">{listing.description}</p>
            </div>

            {features.length > 0 && (
              <div className="surface-card">
                <h2 className="mb-3 font-serif text-xl text-forest-deep">Features</h2>
                <div className="flex flex-wrap gap-2">
                  {features.map((f) => (
                    <span key={f} className="rounded-full border border-clay/30 bg-clay-light px-3 py-1 text-xs font-medium text-clay-deep">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {listing.houseRules && (
              <div className="surface-card">
                <h2 className="mb-3 font-serif text-xl text-forest-deep">House rules</h2>
                <p className="m-0 whitespace-pre-wrap text-stone">{listing.houseRules}</p>
              </div>
            )}

            {blocksResult.results.length > 0 && (
              <div className="surface-card">
                <h2 className="mb-3 font-serif text-xl text-forest-deep">Availability</h2>
                <ReadOnlyCalendar blocks={blocksResult.results} />
              </div>
            )}

            {publicPickupCoords && (
              <div className="surface-card">
                <h2 className="mb-3 font-serif text-xl text-forest-deep">Pickup area</h2>
                <p className="mb-3 text-xs text-stone">
                  Approximate pickup region shown. Exact pickup location is shared after booking is confirmed.
                </p>
                <PickupMapClient lat={publicPickupCoords.lat} lng={publicPickupCoords.lng} />
              </div>
            )}

            <ListingReviews listingId={listing.id} />
            <SimilarListings region={listing.region} excludeId={listing.id} />

            <div className="surface-card">
              <h2 className="mb-3 font-serif text-xl text-forest-deep">About the host</h2>
              <div className={cn("flex items-center gap-3", listing.hostBio ? "mb-3" : "")}>
                {listing.hostImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.hostImage}
                    alt={listing.hostFirstName}
                    className="size-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-forest font-serif text-xl font-medium text-cream">
                    {listing.hostFirstName[0].toUpperCase()}
                  </span>
                )}
                <div>
                  <span className="block text-[17px] font-semibold text-charcoal">{listing.hostFirstName}</span>
                  <Link href={`/hosts/${listing.hostUserId}`} className="text-xs text-stone underline hover:text-charcoal">
                    View host profile
                  </Link>
                </div>
              </div>
              {hostBadges.length > 0 && (
                <div className="mb-3">
                  <HostBadges badges={hostBadges} />
                </div>
              )}
              {listing.hostBio && <p className="m-0 text-stone">{listing.hostBio}</p>}
            </div>
          </div>

          {/* RIGHT — sticky booking widget */}
          <div className="pdp-right">
            <div className="surface-card" id="book-form">
              <div className="mb-4 flex items-baseline justify-between">
                <p className="m-0 text-[22px] font-bold text-charcoal">
                  ${nightlyDollars}
                  <span className="ml-1 text-sm font-normal text-stone">/night</span>
                </p>
                <p className="m-0 text-xs text-stone">
                  min {listing.minimumNights} night{listing.minimumNights !== 1 ? "s" : ""}
                </p>
              </div>

              {isOwner ? (
                <p className="text-stone">This is your listing.</p>
              ) : (
                <BookingRequestForm
                  listingId={listing.id}
                  nightlyRateCents={listing.nightlyRate}
                  minimumNights={listing.minimumNights}
                  instantBook={effectiveInstantBook}
                  listingAddons={addonsResult.results}
                  kycStatus={kycStatus}
                  minDriverAge={listing.minDriverAge}
                  isLoggedIn={isLoggedIn}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {!isOwner && <StickyBookCta nightlyRateCents={listing.nightlyRate} />}
    </main>
  );
}

// ── Read-only availability calendar ──────────────────────────────────────────

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
    <div className="flex flex-col gap-6">
      {months.map(({ year, month }) => {
        const first = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDow = first.getDay();

        return (
          <div key={`${year}-${month}`}>
            <p className="mb-2 font-semibold text-charcoal">{MONTHS[month]} {year}</p>
            <div className="grid grid-cols-7 gap-0.5">
              {DAYS.map((d) => (
                <div key={d} className="pb-1 text-center text-[11px] text-clay">{d}</div>
              ))}
              {Array.from({ length: firstDow }).map((_, i) => <div key={`p-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const ts = Date.UTC(year, month, i + 1);
                const blocked = isBlocked(ts);
                const isPast = new Date(year, month, i + 1) < today;
                return (
                  <div
                    key={ts}
                    className={cn(
                      "rounded px-0.5 py-1.5 text-center text-[13px] border",
                      blocked
                        ? "border-clay bg-clay text-[#fff8ef]"
                        : isPast
                          ? "border-line bg-transparent text-line"
                          : "border-line bg-sand text-charcoal",
                    )}
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

import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { photoUrl } from "@/lib/photos";
import SignOutButton from "@/components/SignOutButton";
import StatTile from "@/components/ui/StatTile";
import EmptyState from "@/components/ui/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VanListing } from "@/lib/types";
import {
  CalendarDays,
  DollarSign,
  Car,
  AlertCircle,
  MessageSquare,
  Receipt,
  MapPin,
} from "lucide-react";

interface ListingRow {
  id: string;
  name: string;
  status: VanListing["status"];
  nightlyRate: number;
  region: string;
  createdAt: number;
  coverPhotoKey: string | null;
}

interface NextBooking {
  id: string;
  vanName: string;
  guestName: string;
  startDate: number;
  endDate: number;
  nights: number;
  status: string;
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", timeZone: "Pacific/Auckland",
  });
}

function fmtNzd(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString("en-NZ")}`;
}

const statusPill: Record<string, string> = {
  pending_review: "inline-block rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground",
  published:      "inline-block rounded-full bg-moss/10 px-2.5 py-0.5 text-[11px] font-medium text-moss",
  rejected:       "inline-block rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium text-destructive",
};

const bookingPill: Record<string, string> = {
  accepted:    "inline-block rounded-full bg-moss/10 px-2.5 py-0.5 text-[11px] font-medium text-moss",
  in_progress: "inline-block rounded-full bg-moss/10 px-2.5 py-0.5 text-[11px] font-medium text-moss",
};

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = (session.user.name ?? "").split(" ")[0] || "there";
  const userId = session.user.id;
  const database = await getDb();

  const profile = await database
    .prepare("SELECT * FROM host_profile WHERE userId = ?")
    .bind(userId)
    .first<{
      firstName: string; lastName: string; region: string; bio: string | null;
      stripeAccountId: string | null; stripeOnboardingCompleted: number;
    }>();

  if (!profile) {
    return (
      <main className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-[1080px]">
          <h1 className="mb-1 font-serif text-3xl text-forest-deep dark:text-cream">Kia ora, {firstName}.</h1>
          <p className="mb-8 text-muted-foreground">Welcome to CampShare. Let&apos;s set up your host profile to get started.</p>
          <div className="max-w-[480px] rounded-2xl border border-border bg-card p-8">
            <h2 className="mb-2 font-serif text-xl text-forest-deep dark:text-cream">Set up your host profile</h2>
            <p className="mb-5 text-sm text-muted-foreground">Tell guests a bit about yourself before you list your first van.</p>
            <Link href="/dashboard/profile" className={cn(buttonVariants())}>
              Create host profile
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const startOfMonthSec = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);

  const [
    listingsResult,
    upcomingResult,
    nextBookingResult,
    earningsResult,
    pendingResult,
    unreadResult,
    templateCountResult,
  ] = await Promise.all([
    database
      .prepare(
        `SELECT vl.id, vl.name, vl.status, vl.nightlyRate, vl.region, vl.createdAt,
                (SELECT r2Key FROM van_photo
                 WHERE vanListingId = vl.id
                 ORDER BY position ASC, createdAt ASC LIMIT 1) AS coverPhotoKey
         FROM van_listing vl
         WHERE vl.hostUserId = ?
         ORDER BY vl.createdAt DESC`
      )
      .bind(userId)
      .all<ListingRow>(),
    database
      .prepare("SELECT COUNT(*) AS cnt FROM booking WHERE hostUserId = ? AND status IN ('requested','accepted','in_progress') AND startDate >= ?")
      .bind(userId, nowSec)
      .first<{ cnt: number }>(),
    database
      .prepare(
        `SELECT b.id, vl.name AS vanName, u.name AS guestName,
                b.startDate, b.endDate, b.nights, b.status
         FROM booking b
         JOIN van_listing vl ON vl.id = b.vanListingId
         JOIN user u ON u.id = b.guestUserId
         WHERE b.hostUserId = ? AND b.status IN ('accepted','in_progress')
           AND b.startDate >= ?
         ORDER BY b.startDate ASC
         LIMIT 1`
      )
      .bind(userId, nowSec)
      .first<NextBooking>(),
    database
      .prepare("SELECT COALESCE(SUM(hostPayoutCents),0) AS total FROM booking WHERE hostUserId = ? AND status IN ('accepted','in_progress','completed') AND paidAt >= ?")
      .bind(userId, startOfMonthSec)
      .first<{ total: number }>(),
    database
      .prepare("SELECT COUNT(*) AS cnt FROM booking WHERE hostUserId = ? AND status = 'requested'")
      .bind(userId)
      .first<{ cnt: number }>(),
    database
      .prepare(
        `SELECT COUNT(*) AS cnt FROM booking_message bm
         JOIN booking b ON b.id = bm.bookingId
         WHERE b.hostUserId = ? AND bm.senderUserId != ? AND bm.readAt IS NULL`
      )
      .bind(userId, userId)
      .first<{ cnt: number }>(),
    database
      .prepare("SELECT COUNT(*) AS cnt FROM message_template WHERE userId = ?")
      .bind(userId)
      .first<{ cnt: number }>(),
  ]);

  const listings = listingsResult.results;
  const activeListings = listings.filter((l) => l.status === "published").length;
  const upcomingCount = upcomingResult?.cnt ?? 0;
  const earningsMonth = earningsResult?.total ?? 0;
  const pendingCount = pendingResult?.cnt ?? 0;
  const unreadCount = unreadResult?.cnt ?? 0;
  const templateCount = templateCountResult?.cnt ?? 0;
  const actionCount = pendingCount + unreadCount + (!profile.stripeAccountId || !profile.stripeOnboardingCompleted ? 1 : 0);
  const stripeSetup = !!(profile.stripeAccountId && profile.stripeOnboardingCompleted);

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[1080px]">

        {/* Greeting */}
        <div className="mb-7">
          <h1 className="mb-1 font-serif text-3xl text-forest-deep dark:text-cream">Kia ora, {firstName}.</h1>
          <p className="text-muted-foreground">Here&apos;s your hosting overview.</p>
        </div>

        {/* Stat tiles */}
        <div className="mb-6 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 min-[720px]:grid-cols-4">
          <StatTile label="Upcoming" value={upcomingCount} sub="bookings" icon={<CalendarDays size={13} />} href="/dashboard/bookings" />
          <StatTile label="Earnings this month" value={fmtNzd(earningsMonth)} sub="after host fees" icon={<DollarSign size={13} />} href="/dashboard/payouts" />
          <StatTile label="Active listings" value={activeListings} sub={`of ${listings.length} total`} icon={<Car size={13} />} href="/dashboard/listings/new" />
          <StatTile label="Action needed" value={actionCount} sub={actionCount > 0 ? `${pendingCount} requests · ${unreadCount} messages` : "All caught up"} icon={<AlertCircle size={13} />} href="/dashboard/bookings" warn={actionCount > 0} />
        </div>

        {/* Stripe warning */}
        {!stripeSetup && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-ochre/40 bg-ochre/5 px-5 py-4">
            <AlertCircle size={18} className="shrink-0 text-ochre" />
            <div className="flex-1">
              <p className="mb-0.5 text-sm font-semibold text-ochre">Connect your bank account</p>
              <p className="text-xs text-muted-foreground">Set up Stripe to receive payouts when guests book your van.</p>
            </div>
            <Link href="/dashboard/payouts/onboard" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
              Set up payouts
            </Link>
          </div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-1 items-start gap-4 min-[900px]:grid-cols-[1fr_320px]">

          {/* LEFT column */}
          <div className="flex flex-col gap-4">

            {/* Next booking card */}
            <div className="cs-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="m-0 font-serif text-lg text-forest-deep dark:text-cream">Next booking</h2>
                <Link href="/dashboard/bookings" className="text-sm text-clay hover:text-clay-deep">All bookings →</Link>
              </div>
              {nextBookingResult ? (
                <div className="flex items-center gap-3.5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius)] bg-clay/10">
                    <CalendarDays size={22} className="text-clay" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 truncate text-sm font-semibold text-foreground">{nextBookingResult.vanName}</p>
                    <p className="mb-1 text-xs text-muted-foreground">
                      {nextBookingResult.guestName} · {fmtDate(nextBookingResult.startDate)} → {fmtDate(nextBookingResult.endDate)} ({nextBookingResult.nights}n)
                    </p>
                    <span className={bookingPill[nextBookingResult.status] ?? bookingPill.accepted}>
                      {nextBookingResult.status === "in_progress" ? "In progress" : "Confirmed"}
                    </span>
                  </div>
                  <Link href={`/dashboard/bookings/${nextBookingResult.id}`} className="shrink-0 text-sm text-clay hover:text-clay-deep">View →</Link>
                </div>
              ) : (
                <EmptyState icon={<CalendarDays size={32} />} heading="No upcoming bookings" body="Confirmed bookings will appear here." />
              )}
            </div>

            {/* Listings card */}
            <div className="cs-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="m-0 font-serif text-lg text-forest-deep dark:text-cream">Your listings</h2>
                <Link href="/dashboard/listings/new" className={cn(buttonVariants({ size: "sm" }))}>+ New listing</Link>
              </div>
              {listings.length === 0 ? (
                <EmptyState icon={<Car size={32} />} heading="No listings yet" body="Add your first van to start earning." cta={{ label: "Add a van", href: "/dashboard/listings/new" }} />
              ) : (
                <div>
                  {listings.map((l) => {
                    const imgUrl = l.coverPhotoKey ? photoUrl(l.coverPhotoKey) : null;
                    return (
                      <Link
                        key={l.id}
                        href={`/dashboard/listings/${l.id}`}
                        className="flex items-center gap-3 border-b border-border py-2.5 no-underline last:border-b-0 hover:opacity-90"
                      >
                        <div className="size-12 h-10 w-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-muted">
                          {imgUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgUrl} alt={l.name} className="size-full object-cover" />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <Car size={18} className="text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{l.name}</p>
                          <p className="text-xs text-muted-foreground">
                            <MapPin size={10} className="mr-0.5 inline-block align-middle" />{l.region}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={statusPill[l.status] ?? statusPill.rejected}>
                            {l.status === "pending_review" ? "in review" : l.status}
                          </span>
                          <p className="mt-1 text-xs text-muted-foreground">${(l.nightlyRate / 100).toFixed(0)}/night</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT column */}
          <div className="flex flex-col gap-4">

            {/* Payouts mini-card */}
            <div className="cs-card px-6 py-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="m-0 flex items-center gap-1.5 font-serif text-base text-forest-deep dark:text-cream">
                  <Receipt size={15} className="text-muted-foreground" /> Payouts
                </h2>
                <Link href="/dashboard/payouts" className="text-sm text-clay hover:text-clay-deep">View →</Link>
              </div>
              {stripeSetup ? (
                <p className="m-0 font-serif text-[1.75rem] font-medium text-foreground">
                  {fmtNzd(earningsMonth)}
                  <span className="ml-1 font-sans text-sm font-normal text-muted-foreground"> this month</span>
                </p>
              ) : (
                <p className="m-0 text-sm text-muted-foreground">
                  <Link href="/dashboard/payouts/onboard" className="text-clay hover:text-clay-deep">Set up Stripe</Link> to track earnings.
                </p>
              )}
            </div>

            {/* Message templates */}
            <div className="cs-card px-6 py-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="m-0 flex items-center gap-1.5 font-serif text-base text-forest-deep dark:text-cream">
                  <MessageSquare size={15} className="text-muted-foreground" /> Templates
                </h2>
                <Link href="/dashboard/templates" className="text-sm text-clay hover:text-clay-deep">Manage →</Link>
              </div>
              <p className="m-0 text-sm text-muted-foreground">
                {templateCount > 0
                  ? `${templateCount} saved template${templateCount !== 1 ? "s" : ""} — drop them into any booking thread.`
                  : "Save canned replies for pickup directions, bond, and bedding."}
              </p>
            </div>

            {/* Profile + account */}
            <div className="cs-card px-6 py-5">
              <div className="mb-3">
                <p className="mb-0.5 text-sm font-semibold text-foreground">{profile.firstName} {profile.lastName}</p>
                <p className="mb-1.5 text-xs text-muted-foreground">{session.user.email}</p>
                <p className="text-xs text-muted-foreground">{profile.region}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard/profile" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Edit profile</Link>
                <SignOutButton />
              </div>
            </div>

            {/* Quick links */}
            <div className="cs-card px-6 py-5">
              <h2 className="mb-3 font-serif text-[15px] text-forest-deep dark:text-cream">More</h2>
              <div className="flex flex-col gap-1.5">
                <Link href="/trips" className="flex items-center gap-1.5 py-1 text-sm text-muted-foreground hover:text-foreground">
                  <CalendarDays size={14} className="text-muted-foreground" /> My trips as a guest
                </Link>
                <Link href="/dashboard/saved" className="flex items-center gap-1.5 py-1 text-sm text-muted-foreground hover:text-foreground">
                  ♡ Saved vans
                </Link>
                <Link href="/dashboard/reviews" className="flex items-center gap-1.5 py-1 text-sm text-muted-foreground hover:text-foreground">
                  ★ Reviews
                </Link>
                <Link href="/vans" className="flex items-center gap-1.5 py-1 text-sm text-muted-foreground hover:text-foreground">
                  <Car size={14} className="text-muted-foreground" /> Browse all vans
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}

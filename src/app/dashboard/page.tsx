import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { photoUrl } from "@/lib/photos";
import SignOutButton from "@/components/SignOutButton";
import StatTile from "@/components/ui/StatTile";
import EmptyState from "@/components/ui/EmptyState";
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

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = (session.user.name ?? "").split(" ")[0] || "there";
  const userId = session.user.id;

  const profile = await db()
    .prepare("SELECT * FROM host_profile WHERE userId = ?")
    .bind(userId)
    .first<{
      firstName: string; lastName: string; region: string; bio: string | null;
      stripeAccountId: string | null; stripeOnboardingCompleted: number;
    }>();

  if (!profile) {
    return (
      <main className="cs-page">
        <div className="cs-container">
          <h1>Kia ora, {firstName}.</h1>
          <p className="cs-muted" style={{ marginBottom: 32 }}>Welcome to CampShare. Let&apos;s set up your host profile to get started.</p>
          <div className="cs-card" style={{ maxWidth: 480 }}>
            <h2 style={{ margin: "0 0 8px" }}>Set up your host profile</h2>
            <p className="cs-muted cs-small" style={{ margin: "0 0 20px" }}>Tell guests a bit about yourself before you list your first van.</p>
            <Link href="/dashboard/profile" className="cs-btn cs-btn-primary">
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
    db()
      .prepare("SELECT id, name, status, nightlyRate, region, createdAt, coverPhotoKey FROM van_listing WHERE hostUserId = ? ORDER BY createdAt DESC")
      .bind(userId)
      .all<ListingRow>(),
    db()
      .prepare("SELECT COUNT(*) AS cnt FROM booking WHERE hostUserId = ? AND status IN ('requested','accepted','in_progress') AND startDate >= ?")
      .bind(userId, nowSec)
      .first<{ cnt: number }>(),
    db()
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
    db()
      .prepare("SELECT COALESCE(SUM(hostPayoutCents),0) AS total FROM booking WHERE hostUserId = ? AND status IN ('accepted','in_progress','completed') AND paidAt >= ?")
      .bind(userId, startOfMonthSec)
      .first<{ total: number }>(),
    db()
      .prepare("SELECT COUNT(*) AS cnt FROM booking WHERE hostUserId = ? AND status = 'requested'")
      .bind(userId)
      .first<{ cnt: number }>(),
    db()
      .prepare(
        `SELECT COUNT(*) AS cnt FROM booking_message bm
         JOIN booking b ON b.id = bm.bookingId
         WHERE b.hostUserId = ? AND bm.senderUserId != ? AND bm.readAt IS NULL`
      )
      .bind(userId, userId)
      .first<{ cnt: number }>(),
    db()
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
    <main className="cs-page">
      <div className="cs-container">

        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 4px" }}>Kia ora, {firstName}.</h1>
          <p className="cs-muted" style={{ margin: 0 }}>Here&apos;s your hosting overview.</p>
        </div>

        {/* Stat tiles */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }} className="cs-stat-grid">
          <StatTile
            label="Upcoming"
            value={upcomingCount}
            sub="bookings"
            icon={<CalendarDays size={13} />}
            href="/dashboard/bookings"
          />
          <StatTile
            label="Earnings this month"
            value={fmtNzd(earningsMonth)}
            sub="after host fees"
            icon={<DollarSign size={13} />}
            href="/dashboard/payouts"
          />
          <StatTile
            label="Active listings"
            value={activeListings}
            sub={`of ${listings.length} total`}
            icon={<Car size={13} />}
            href="/dashboard/listings/new"
          />
          <StatTile
            label="Action needed"
            value={actionCount}
            sub={actionCount > 0 ? `${pendingCount} requests · ${unreadCount} messages` : "All caught up"}
            icon={<AlertCircle size={13} />}
            href="/dashboard/bookings"
            warn={actionCount > 0}
          />
        </div>

        {/* Stripe warning */}
        {!stripeSetup && (
          <div className="cs-card" style={{ background: "#fffbeb", border: "1px solid #fcd34d", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertCircle size={18} style={{ color: "#d97706", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 14, color: "#92400e" }}>Connect your bank account</p>
                <p className="cs-muted cs-small" style={{ margin: 0 }}>Set up Stripe to receive payouts when guests book your van.</p>
              </div>
              <Link href="/dashboard/payouts/onboard" className="cs-btn cs-btn-primary" style={{ padding: "8px 16px", fontSize: 13, flexShrink: 0 }}>
                Set up payouts
              </Link>
            </div>
          </div>
        )}

        {/* Two-column grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 16,
          alignItems: "start",
        }} className="cs-dash-grid">

          {/* LEFT column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Today card */}
            <div className="cs-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Next booking</h2>
                <Link href="/dashboard/bookings" className="cs-small" style={{ color: "var(--clay-500)" }}>
                  All bookings →
                </Link>
              </div>
              {nextBookingResult ? (
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{
                    width: 48, height: 48, background: "var(--clay-100)", borderRadius: "var(--radius)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <CalendarDays size={22} style={{ color: "var(--clay-500)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 14 }}>{nextBookingResult.vanName}</p>
                    <p className="cs-muted cs-small" style={{ margin: "0 0 4px" }}>
                      {nextBookingResult.guestName} · {fmtDate(nextBookingResult.startDate)} → {fmtDate(nextBookingResult.endDate)} ({nextBookingResult.nights}n)
                    </p>
                    <span className={`cs-pill cs-pill-${nextBookingResult.status === "accepted" ? "approved" : "pending"}`} style={{ fontSize: 11 }}>
                      {nextBookingResult.status === "in_progress" ? "In progress" : "Confirmed"}
                    </span>
                  </div>
                  <Link href={`/dashboard/bookings/${nextBookingResult.id}`} className="cs-small" style={{ color: "var(--clay-500)", flexShrink: 0 }}>
                    View →
                  </Link>
                </div>
              ) : (
                <EmptyState
                  icon={<CalendarDays size={32} />}
                  heading="No upcoming bookings"
                  body="Confirmed bookings will appear here."
                />
              )}
            </div>

            {/* Listings card */}
            <div className="cs-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Your listings</h2>
                <Link href="/dashboard/listings/new" className="cs-btn cs-btn-primary" style={{ padding: "8px 14px", fontSize: 13 }}>
                  + New listing
                </Link>
              </div>
              {listings.length === 0 ? (
                <EmptyState
                  icon={<Car size={32} />}
                  heading="No listings yet"
                  body="Add your first van to start earning."
                  cta={{ label: "Add a van", href: "/dashboard/listings/new" }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {listings.map((l) => {
                    const imgUrl = l.coverPhotoKey ? photoUrl(l.coverPhotoKey) : null;
                    return (
                      <Link
                        key={l.id}
                        href={`/dashboard/listings/${l.id}`}
                        style={{
                          display: "flex", gap: 12, alignItems: "center",
                          padding: "10px 0", borderBottom: "1px solid var(--line)",
                          textDecoration: "none", color: "inherit",
                        }}
                      >
                        <div style={{
                          width: 48, height: 40, borderRadius: "var(--radius-sm)",
                          background: "var(--sand-200)", flexShrink: 0, overflow: "hidden",
                        }}>
                          {imgUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgUrl} alt={l.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Car size={18} style={{ color: "var(--stone)" }} />
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</p>
                          <p className="cs-muted cs-small" style={{ margin: 0 }}>
                            <MapPin size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />{l.region}
                          </p>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <span className={`cs-pill cs-pill-${l.status === "pending_review" ? "pending" : l.status === "published" ? "approved" : "rejected"}`} style={{ fontSize: 11 }}>
                            {l.status === "pending_review" ? "in review" : l.status}
                          </span>
                          <p className="cs-muted cs-small" style={{ margin: "4px 0 0" }}>${(l.nightlyRate / 100).toFixed(0)}/night</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Payouts mini-card */}
            <div className="cs-card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
                  <Receipt size={15} style={{ color: "var(--stone)" }} /> Payouts
                </h2>
                <Link href="/dashboard/payouts" className="cs-small" style={{ color: "var(--clay-500)" }}>View →</Link>
              </div>
              {stripeSetup ? (
                <p style={{ margin: 0, fontSize: 28, fontFamily: "var(--font-serif)", fontWeight: 500 }}>
                  {fmtNzd(earningsMonth)}
                  <span className="cs-muted" style={{ fontSize: 13, fontWeight: 400, fontFamily: "var(--font-sans)" }}> this month</span>
                </p>
              ) : (
                <p className="cs-muted cs-small" style={{ margin: 0 }}>
                  <Link href="/dashboard/payouts/onboard" style={{ color: "var(--clay-500)" }}>Set up Stripe</Link> to track earnings.
                </p>
              )}
            </div>

            {/* Message templates */}
            <div className="cs-card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
                  <MessageSquare size={15} style={{ color: "var(--stone)" }} /> Templates
                </h2>
                <Link href="/dashboard/templates" className="cs-small" style={{ color: "var(--clay-500)" }}>Manage →</Link>
              </div>
              <p className="cs-muted cs-small" style={{ margin: 0 }}>
                {templateCount > 0
                  ? `${templateCount} saved template${templateCount !== 1 ? "s" : ""} — drop them into any booking thread.`
                  : "Save canned replies for pickup directions, bond, and bedding."}
              </p>
            </div>

            {/* Profile + account */}
            <div className="cs-card" style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 14 }}>{profile.firstName} {profile.lastName}</p>
                <p className="cs-muted cs-small" style={{ margin: "0 0 6px" }}>{session.user.email}</p>
                <p className="cs-muted cs-small" style={{ margin: 0 }}>{profile.region}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href="/dashboard/profile" className="cs-btn cs-btn-ghost" style={{ fontSize: 13, padding: "6px 12px" }}>
                  Edit profile
                </Link>
                <SignOutButton />
              </div>
            </div>

            {/* Quick links */}
            <div className="cs-card" style={{ padding: "20px 24px" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>More</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Link href="/trips" className="cs-small" style={{ color: "var(--ink-700)", display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  <CalendarDays size={14} style={{ color: "var(--stone)" }} /> My trips as a guest
                </Link>
                <Link href="/dashboard/saved" className="cs-small" style={{ color: "var(--ink-700)", display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  ♡ Saved vans
                </Link>
                <Link href="/dashboard/reviews" className="cs-small" style={{ color: "var(--ink-700)", display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  ★ Reviews
                </Link>
                <Link href="/vans" className="cs-small" style={{ color: "var(--ink-700)", display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  <Car size={14} style={{ color: "var(--stone)" }} /> Browse all vans
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}

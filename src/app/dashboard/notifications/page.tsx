import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Notifications — CampShare",
};

interface NotifRow {
  id: string;
  type: string;
  payload: string;
  readAt: number | null;
  createdAt: number;
}

function label(type: string, payload: Record<string, unknown>): string {
  const van = (payload.vanName as string) ?? "your van";
  switch (type) {
    case "booking_requested":  return `New booking request for ${van}`;
    case "booking_accepted":   return `Your booking for ${van} was accepted`;
    case "booking_declined":   return `Booking request for ${van} was declined`;
    case "booking_cancelled":  return `Booking for ${van} was cancelled`;
    case "review_prompt":      return `Time to review your trip in ${van}`;
    case "review_received":    return `New review for ${van}`;
    case "host_response":      return `Your host replied to your review for ${van}`;
    case "message":            return `New message about ${van}`;
    case "payout_sent":        return `Payout sent for ${van}`;
    case "deposit_released":   return `Deposit released for ${van}`;
    default:                   return "Notification";
  }
}

function href(type: string, payload: Record<string, unknown>): string {
  const bookingId = payload.bookingId as string | undefined;
  switch (type) {
    case "booking_requested":
    case "booking_accepted":
    case "booking_declined":
    case "booking_cancelled":
    case "message":
      return bookingId ? `/dashboard/bookings/${bookingId}` : "/dashboard/bookings";
    case "review_prompt":
      return bookingId ? `/trips/${bookingId}/review` : "/dashboard/reviews";
    case "review_received":
    case "host_response":
      return "/dashboard/reviews";
    case "payout_sent":
      return "/dashboard/payouts";
    case "deposit_released":
      return bookingId ? `/trips/${bookingId}` : "/trips";
    default:
      return "/dashboard";
  }
}

function fmtDate(sec: number): string {
  return new Date(sec * 1000).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit",
    timeZone: "Pacific/Auckland",
  });
}

export default async function NotificationsPage() {
  const session = await requireSession();
  const uid = session.user.id;

  const { results } = await db()
    .prepare(
      `SELECT id, type, payload, readAt, createdAt
       FROM notification
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 50`
    )
    .bind(uid)
    .all<NotifRow>();

  const items = (results ?? []).map((r) => ({
    ...r,
    parsedPayload: JSON.parse(r.payload) as Record<string, unknown>,
  }));

  // Mark all as read (server-side — no JS required for the page itself)
  const nowSec = Math.floor(Date.now() / 1000);
  await db()
    .prepare("UPDATE notification SET readAt = ? WHERE userId = ? AND readAt IS NULL")
    .bind(nowSec, uid)
    .run();

  return (
    <main className="cs-page">
      <div className="cs-container">
        <h1 style={{ marginBottom: 4 }}>Notifications</h1>
        <p className="cs-muted" style={{ marginBottom: 24 }}>Your last 50 notifications.</p>

        {items.length === 0 ? (
          <div className="cs-card" style={{ textAlign: "center", padding: 48 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Nothing here yet</p>
            <p className="cs-muted cs-small" style={{ marginBottom: 20 }}>
              Booking updates, review prompts, and messages will appear here.
            </p>
            <Link href="/vans" className="cs-btn cs-btn-primary">Browse vans</Link>
          </div>
        ) : (
          <div className="cs-card" style={{ padding: 0, overflow: "hidden" }}>
            {items.map((n, i) => (
              <Link
                key={n.id}
                href={href(n.type, n.parsedPayload)}
                style={{
                  display: "block",
                  padding: "14px 20px",
                  borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none",
                  textDecoration: "none",
                  background: n.readAt === null ? "rgba(194,97,58,0.05)" : "transparent",
                  transition: "background 0.12s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 14, color: "var(--charcoal-soft)", fontWeight: n.readAt === null ? 600 : 400 }}>
                    {label(n.type, n.parsedPayload)}
                  </span>
                  <span className="cs-muted" style={{ fontSize: 12, flexShrink: 0 }}>
                    {fmtDate(n.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

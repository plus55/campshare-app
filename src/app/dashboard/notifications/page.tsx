import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";

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
  const database = await getDb();

  const { results } = await database
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

  const nowSec = Math.floor(Date.now() / 1000);
  await database
    .prepare("UPDATE notification SET readAt = ? WHERE userId = ? AND readAt IS NULL")
    .bind(nowSec, uid)
    .run();

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[1080px]">
        <h1 className="mb-1 font-serif text-3xl text-forest-deep">Notifications</h1>
        <p className="mb-6 text-stone">Your last 50 notifications.</p>

        {items.length === 0 ? (
          <div className="cs-card flex flex-col items-center gap-3 py-12 text-center">
            <p className="font-semibold text-charcoal">Nothing here yet</p>
            <p className="max-w-[36ch] text-sm text-stone">
              Booking updates, review prompts, and messages will appear here.
            </p>
            <Link href="/vans" className="text-sm text-clay hover:text-clay-deep">Browse vans</Link>
          </div>
        ) : (
          <div className="cs-card overflow-hidden p-0">
            {items.map((n, i) => (
              <Link
                key={n.id}
                href={href(n.type, n.parsedPayload)}
                className={`block border-b border-line px-5 py-3.5 no-underline transition-colors last:border-b-0 hover:bg-sand ${
                  n.readAt === null ? "bg-clay/5" : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`text-sm ${n.readAt === null ? "font-semibold text-charcoal-soft" : "font-normal text-charcoal-soft"}`}>
                    {label(n.type, n.parsedPayload)}
                  </span>
                  <span className="shrink-0 text-xs text-stone">{fmtDate(n.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

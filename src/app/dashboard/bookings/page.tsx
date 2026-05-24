import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { expireBookingRequest } from "@/lib/booking-expiry";
import type { Booking } from "@/lib/types";

interface BookingRow extends Booking {
  vanName: string;
  vanSlug: string;
  guestName: string;
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Pacific/Auckland",
  });
}

export default async function DashboardBookingsPage() {
  const session = await requireSession();
  const database = await getDb();

  const result = await database
    .prepare(
      `SELECT b.*, vl.name AS vanName, vl.slug AS vanSlug,
              u.name AS guestName
       FROM booking b
       JOIN van_listing vl ON vl.id = b.vanListingId
       JOIN user u ON u.id = b.guestUserId
       WHERE b.hostUserId = ?
       ORDER BY
         CASE WHEN b.status = 'requested' THEN 0 ELSE 1 END ASC,
         b.expiresAt ASC,
         b.startDate DESC`
    )
    .bind(session.user.id)
    .all<BookingRow>();

  const rows = result.results;

  // Lazy expiry
  const nowSec = Math.floor(Date.now() / 1000);
  const expiredIds: string[] = [];
  for (const booking of rows.filter((r) => r.status === "requested" && r.expiresAt < nowSec)) {
    if (await expireBookingRequest(booking, nowSec)) expiredIds.push(booking.id);
  }
  rows.forEach((r) => { if (expiredIds.includes(r.id)) r.status = "expired"; });

  const pending  = rows.filter((r) => r.status === "requested");
  const active   = rows.filter((r) => r.status === "accepted");
  const archived = rows.filter((r) => !["requested", "accepted"].includes(r.status));

  function Section({ title, items }: { title: string; items: BookingRow[] }) {
    if (items.length === 0) return null;
    return (
      <div className="surface-card mt-4">
        <h2 className="mb-4 font-serif text-lg text-forest-deep dark:text-cream">{title}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Status", "Van", "Guest", "Dates", "Total", ""].map((h) => (
                  <th key={h} className="border-b border-border pb-2 text-left text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="hover:bg-muted">
                  <td className="py-2.5 pr-3"><BookingStatusBadge status={b.status} /></td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">{b.vanName}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">{b.guestName}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                    {fmtDate(b.startDate)} → {fmtDate(b.endDate)}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">${(b.totalCents / 100).toFixed(0)}</td>
                  <td className="py-2.5">
                    <Link href={`/dashboard/bookings/${b.id}`} className="text-xs text-clay hover:text-clay-deep">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[1080px]">
        <h1 className="mb-1 font-serif text-3xl text-forest-deep dark:text-cream">Bookings</h1>
        <p className="mb-0 text-muted-foreground">Requests and bookings across your listings.</p>

        {rows.length === 0 ? (
          <div className="surface-card mt-6">
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-[2rem]">📋</span>
              <h3 className="font-serif text-lg text-foreground">No bookings yet</h3>
              <p className="max-w-[36ch] text-sm text-muted-foreground">Requests from guests will appear here once your listing is live.</p>
            </div>
          </div>
        ) : (
          <>
            <Section title="Pending requests" items={pending} />
            <Section title="Confirmed bookings" items={active} />
            <Section title="Past & cancelled" items={archived} />
          </>
        )}
      </div>
    </main>
  );
}

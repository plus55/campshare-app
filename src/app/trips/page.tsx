import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { expireBookingRequest } from "@/lib/booking-expiry";
import type { Booking, BookingStatus } from "@/lib/types";

interface TripRow extends Booking {
  vanName: string;
  vanSlug: string;
  hostFirstName: string | null;
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Pacific/Auckland",
  });
}

const ACTIVE: BookingStatus[] = ["requested", "accepted"];
const PAST:   BookingStatus[] = ["declined", "cancelled_by_guest", "cancelled_by_host", "expired"];

export default async function TripsPage() {
  const session = await requireSession();
  const database = await getDb();

  const result = await database
    .prepare(
      `SELECT b.*, vl.name AS vanName, vl.slug AS vanSlug,
              hp.firstName AS hostFirstName
       FROM booking b
       JOIN van_listing vl ON vl.id = b.vanListingId
       LEFT JOIN host_profile hp ON hp.userId = b.hostUserId
       WHERE b.guestUserId = ?
       ORDER BY b.startDate DESC`
    )
    .bind(session.user.id)
    .all<TripRow>();

  const trips = result.results;

  const nowSec = Math.floor(Date.now() / 1000);
  const expiredIds: string[] = [];
  for (const trip of trips.filter((t) => t.status === "requested" && t.expiresAt < nowSec)) {
    if (await expireBookingRequest(trip, nowSec)) expiredIds.push(trip.id);
  }
  trips.forEach((t) => { if (expiredIds.includes(t.id)) t.status = "expired"; });

  const active = trips.filter((t) => ACTIVE.includes(t.status));
  const past   = trips.filter((t) => PAST.includes(t.status));

  function Section({ title, rows }: { title: string; rows: TripRow[] }) {
    if (rows.length === 0) return null;
    return (
      <div className="surface-card mt-4">
        <h2 className="mb-4 font-serif text-lg text-forest-deep">{title}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Status", "Van", "Dates", "Total", ""].map((h) => (
                  <th key={h} className="border-b border-line pb-2 text-left text-[11px] font-medium uppercase tracking-[0.04em] text-stone">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-sand">
                  <td className="py-2.5 pr-3"><BookingStatusBadge status={t.status} /></td>
                  <td className="py-2.5 pr-3 text-xs text-charcoal-soft">{t.vanName}</td>
                  <td className="py-2.5 pr-3 text-xs text-stone">{fmtDate(t.startDate)} → {fmtDate(t.endDate)}</td>
                  <td className="py-2.5 pr-3 text-xs text-charcoal-soft">${(t.totalCents / 100).toFixed(0)}</td>
                  <td className="py-2.5">
                    <Link href={`/trips/${t.id}`} className="text-xs text-clay hover:text-clay-deep">View →</Link>
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
        <div className="mb-0 flex items-start justify-between">
          <div>
            <h1 className="mb-1 font-serif text-3xl text-forest-deep">My trips</h1>
            <p className="text-stone">Your van bookings across Aotearoa.</p>
          </div>
          <Link href="/vans" className={cn(buttonVariants({ variant: "outline" }))}>Browse vans</Link>
        </div>

        {trips.length === 0 ? (
          <div className="surface-card mt-6 flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-stone">No trips yet.</p>
            <Link href="/vans" className={cn(buttonVariants())}>Find a van</Link>
          </div>
        ) : (
          <>
            <Section title="Active" rows={active} />
            <Section title="Past & cancelled" rows={past} />
          </>
        )}
      </div>
    </main>
  );
}

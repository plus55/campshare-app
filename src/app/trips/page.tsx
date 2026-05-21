import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
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

  const result = await db()
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

  // Lazy expiry
  const nowSec = Math.floor(Date.now() / 1000);
  const expiredIds = trips
    .filter((t) => t.status === "requested" && t.expiresAt < nowSec)
    .map((t) => t.id);
  for (const id of expiredIds) {
    await db().prepare("UPDATE booking SET status = 'expired', updatedAt = ? WHERE id = ?").bind(nowSec, id).run();
  }
  trips.forEach((t) => {
    if (expiredIds.includes(t.id)) t.status = "expired";
  });

  const active = trips.filter((t) => ACTIVE.includes(t.status));
  const past   = trips.filter((t) => PAST.includes(t.status));

  function Section({ title, rows }: { title: string; rows: TripRow[] }) {
    if (rows.length === 0) return null;
    return (
      <div className="cs-card" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 16 }}>{title}</h2>
        <table className="cs-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Van</th>
              <th>Dates</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td><BookingStatusBadge status={t.status} /></td>
                <td>{t.vanName}</td>
                <td className="cs-muted cs-small">
                  {fmtDate(t.startDate)} → {fmtDate(t.endDate)}
                </td>
                <td className="cs-small">${(t.totalCents / 100).toFixed(0)}</td>
                <td>
                  <Link href={`/trips/${t.id}`} className="cs-small">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <main className="cs-page">
      <div className="cs-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1>My trips</h1>
            <p className="cs-muted">Your van bookings across Aotearoa.</p>
          </div>
          <Link href="/vans" className="cs-btn cs-btn-ghost">Browse vans</Link>
        </div>

        {trips.length === 0 ? (
          <div className="cs-card" style={{ marginTop: 24, textAlign: "center" }}>
            <p className="cs-muted">No trips yet.</p>
            <Link href="/vans" className="cs-btn cs-btn-primary" style={{ marginTop: 12, display: "inline-flex" }}>
              Find a van
            </Link>
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

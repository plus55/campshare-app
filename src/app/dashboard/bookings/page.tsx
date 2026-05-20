import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { BookingStatusBadge } from "@/components/BookingStatusBadge";
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

  const result = await db()
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
  const expiredIds = rows
    .filter((r) => r.status === "requested" && r.expiresAt < nowSec)
    .map((r) => r.id);
  for (const id of expiredIds) {
    await db().prepare("UPDATE booking SET status = 'expired', updatedAt = ? WHERE id = ?").bind(nowSec, id).run();
  }
  rows.forEach((r) => { if (expiredIds.includes(r.id)) r.status = "expired"; });

  const pending  = rows.filter((r) => r.status === "requested");
  const active   = rows.filter((r) => r.status === "accepted");
  const archived = rows.filter((r) => !["requested", "accepted"].includes(r.status));

  function Section({ title, items }: { title: string; items: BookingRow[] }) {
    if (items.length === 0) return null;
    return (
      <div className="cs-card" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 16 }}>{title}</h2>
        <table className="cs-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Van</th>
              <th>Guest</th>
              <th>Dates</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id}>
                <td><BookingStatusBadge status={b.status} /></td>
                <td className="cs-small">{b.vanName}</td>
                <td className="cs-small">{b.guestName}</td>
                <td className="cs-muted cs-small">
                  {fmtDate(b.startDate)} → {fmtDate(b.endDate)}
                </td>
                <td className="cs-small">${(b.totalCents / 100).toFixed(0)}</td>
                <td>
                  <Link href={`/dashboard/bookings/${b.id}`} className="cs-small">View →</Link>
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
        <span className="cs-brand">CampShare</span>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1>Bookings</h1>
            <p className="cs-muted">Requests and bookings across your listings.</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="cs-card" style={{ marginTop: 24, textAlign: "center" }}>
            <p className="cs-muted">No bookings yet.</p>
          </div>
        ) : (
          <>
            <Section title="Pending requests" items={pending} />
            <Section title="Confirmed bookings" items={active} />
            <Section title="Past & cancelled" items={archived} />
          </>
        )}

        <p style={{ marginTop: 24 }}>
          <Link href="/dashboard" className="cs-muted cs-small">← Dashboard</Link>
        </p>
      </div>
    </main>
  );
}

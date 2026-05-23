import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

interface DisputeRow {
  id: string;
  bookingId: string;
  initiatorUserId: string;
  reason: string;
  status: string;
  createdAt: number;
  resolvedAt: number | null;
  initiatorName: string;
  initiatorEmail: string;
  vanName: string;
}

const REASON_LABEL: Record<string, string> = {
  damage: "Damage",
  cleanliness: "Cleanliness",
  misrepresentation: "Misrepresentation",
  no_show_host: "Host no-show",
  no_show_guest: "Guest no-show",
  other: "Other",
};

function fmtDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function AdminDisputesPage() {
  await requireAdmin();

  const rows = await db()
    .prepare(
      `SELECT d.id, d.bookingId, d.initiatorUserId, d.reason, d.status, d.createdAt, d.resolvedAt,
              u.name AS initiatorName, u.email AS initiatorEmail,
              vl.name AS vanName
       FROM dispute d
       JOIN user u ON u.id = d.initiatorUserId
       JOIN booking b ON b.id = d.bookingId
       JOIN van_listing vl ON vl.id = b.vanListingId
       ORDER BY
         CASE WHEN d.status IN ('open','under_review') THEN 0 ELSE 1 END,
         d.createdAt DESC`
    )
    .all<DisputeRow>();

  const openRows = rows.results.filter((r) => r.status === "open" || r.status === "under_review");
  const closedRows = rows.results.filter((r) => r.status !== "open" && r.status !== "under_review");

  return (
    <main className="cs-page">
      <div className="cs-container">
        <h1>Disputes</h1>
        <p className="cs-muted">{openRows.length} active · {closedRows.length} closed</p>

        <h2 style={{ marginTop: 24 }}>Active</h2>
        {openRows.length === 0 ? (
          <div className="cs-card"><p className="cs-muted" style={{ margin: 0 }}>No active disputes.</p></div>
        ) : (
          <DisputeList rows={openRows} />
        )}

        <h2 style={{ marginTop: 24 }}>Closed</h2>
        {closedRows.length === 0 ? (
          <div className="cs-card"><p className="cs-muted" style={{ margin: 0 }}>No closed disputes yet.</p></div>
        ) : (
          <DisputeList rows={closedRows} />
        )}
      </div>
    </main>
  );
}

function DisputeList({ rows }: { rows: DisputeRow[] }) {
  return (
    <div className="cs-card" style={{ padding: 0 }}>
      <table className="cs-table">
        <thead>
          <tr>
            <th>Van</th>
            <th>Reason</th>
            <th>Initiator</th>
            <th>Status</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td>{d.vanName}</td>
              <td className="cs-small">{REASON_LABEL[d.reason] ?? d.reason}</td>
              <td>
                <div>{d.initiatorName}</div>
                <div className="cs-muted cs-small">{d.initiatorEmail}</div>
              </td>
              <td><span className="cs-pill" style={{ fontSize: 11 }}>{d.status}</span></td>
              <td className="cs-muted cs-small">{fmtDate(d.createdAt)}</td>
              <td><Link href={`/admin/disputes/${d.id}`} className="cs-small">Review →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

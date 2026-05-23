import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import ReportActions from "./ReportActions";

interface ReportRow {
  id: string;
  reporterUserId: string;
  reportedUserId: string;
  reason: string;
  details: string | null;
  bookingId: string | null;
  status: "open" | "reviewed" | "actioned" | "dismissed";
  adminNote: string | null;
  createdAt: number;
  reporterName: string;
  reporterEmail: string;
  reportedName: string;
  reportedEmail: string;
}

const REASON_LABEL: Record<string, string> = {
  inappropriate_behaviour: "Inappropriate behaviour",
  fraud: "Fraud / scam",
  no_show: "No-show",
  property_damage: "Property damage",
  other: "Other",
};

function fmtDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function AdminReportsPage() {
  await requireAdmin();

  const rows = await db()
    .prepare(
      `SELECT r.*,
              ur.name AS reporterName, ur.email AS reporterEmail,
              ud.name AS reportedName, ud.email AS reportedEmail
       FROM user_report r
       JOIN user ur ON ur.id = r.reporterUserId
       JOIN user ud ON ud.id = r.reportedUserId
       ORDER BY
         CASE WHEN r.status = 'open' THEN 0 ELSE 1 END,
         r.createdAt DESC`
    )
    .all<ReportRow>();

  const open = rows.results.filter((r) => r.status === "open");
  const closed = rows.results.filter((r) => r.status !== "open");

  return (
    <main className="cs-page">
      <div className="cs-container">
        <h1>Reports</h1>
        <p className="cs-muted">{open.length} open · {closed.length} closed</p>

        <h2 style={{ marginTop: 24 }}>Open</h2>
        {open.length === 0 ? (
          <div className="cs-card"><p className="cs-muted" style={{ margin: 0 }}>No open reports.</p></div>
        ) : (
          open.map((r) => <ReportRowCard key={r.id} r={r} />)
        )}

        <h2 style={{ marginTop: 24 }}>Closed</h2>
        {closed.length === 0 ? (
          <div className="cs-card"><p className="cs-muted" style={{ margin: 0 }}>No closed reports yet.</p></div>
        ) : (
          closed.map((r) => <ReportRowCard key={r.id} r={r} />)
        )}
      </div>
    </main>
  );
}

function ReportRowCard({ r }: { r: ReportRow }) {
  return (
    <div className="cs-card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <strong>{REASON_LABEL[r.reason] ?? r.reason}</strong>
            <span className="cs-pill" style={{ fontSize: 11, padding: "2px 8px" }}>{r.status}</span>
            <span className="cs-muted cs-small">{fmtDate(r.createdAt)}</span>
          </div>
          <p className="cs-small" style={{ margin: "0 0 4px" }}>
            <strong>{r.reportedName}</strong> <span className="cs-muted">({r.reportedEmail})</span>
            <span className="cs-muted"> reported by </span>
            <strong>{r.reporterName}</strong> <span className="cs-muted">({r.reporterEmail})</span>
          </p>
          {r.bookingId && (
            <p className="cs-small" style={{ margin: "0 0 4px" }}>
              Booking: <Link href={`/admin/bookings/${r.bookingId}`}>{r.bookingId.slice(0, 8)}…</Link>
            </p>
          )}
          {r.details && (
            <p className="cs-muted" style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", fontSize: 13 }}>{r.details}</p>
          )}
          {r.adminNote && (
            <p className="cs-small" style={{ margin: "8px 0 0", padding: "8px 12px", background: "var(--sand-100)", borderRadius: 6 }}>
              <strong>Admin note:</strong> {r.adminNote}
            </p>
          )}
        </div>
      </div>
      {r.status === "open" && (
        <div style={{ marginTop: 12 }}>
          <ReportActions reportId={r.id} />
        </div>
      )}
    </div>
  );
}

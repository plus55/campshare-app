import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";
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
  const database = await getDb();

  const rows = await database
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
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[1080px]">
        <p className="mb-2 text-sm"><Link href="/admin" className="text-stone hover:text-charcoal">← Admin</Link></p>
        <h1 className="mb-1 font-serif text-3xl text-forest-deep">Reports</h1>
        <p className="mb-6 text-stone">{open.length} open · {closed.length} closed</p>

        <h2 className="mb-3 font-serif text-xl text-forest-deep">Open</h2>
        {open.length === 0 ? (
          <div className="rounded-2xl border border-line bg-cream p-6 text-sm text-stone">No open reports.</div>
        ) : (
          <div className="flex flex-col gap-3">{open.map((r) => <ReportRowCard key={r.id} r={r} />)}</div>
        )}

        <h2 className="mb-3 mt-8 font-serif text-xl text-forest-deep">Closed</h2>
        {closed.length === 0 ? (
          <div className="rounded-2xl border border-line bg-cream p-6 text-sm text-stone">No closed reports yet.</div>
        ) : (
          <div className="flex flex-col gap-3">{closed.map((r) => <ReportRowCard key={r.id} r={r} />)}</div>
        )}
      </div>
    </main>
  );
}

function ReportRowCard({ r }: { r: ReportRow }) {
  return (
    <div className="rounded-2xl border border-line bg-cream p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <strong className="text-charcoal">{REASON_LABEL[r.reason] ?? r.reason}</strong>
            <span className="rounded-full bg-sand-warm px-2.5 py-0.5 text-[11px] font-medium text-stone">{r.status}</span>
            <span className="text-xs text-stone">{fmtDate(r.createdAt)}</span>
          </div>
          <p className="mb-1 text-sm">
            <strong className="text-charcoal">{r.reportedName}</strong>
            <span className="text-stone"> ({r.reportedEmail}) reported by </span>
            <strong className="text-charcoal">{r.reporterName}</strong>
            <span className="text-stone"> ({r.reporterEmail})</span>
          </p>
          {r.bookingId && (
            <p className="mb-1 text-sm text-stone">
              Booking: <Link href={`/admin/bookings/${r.bookingId}`} className="text-clay hover:text-clay-deep">{r.bookingId.slice(0, 8)}…</Link>
            </p>
          )}
          {r.details && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-stone">{r.details}</p>
          )}
          {r.adminNote && (
            <p className="mt-2 rounded-lg bg-sand px-3 py-2 text-sm text-charcoal-soft">
              <strong className="text-charcoal">Admin note:</strong> {r.adminNote}
            </p>
          )}
        </div>
      </div>
      {r.status === "open" && (
        <div className="mt-3">
          <ReportActions reportId={r.id} />
        </div>
      )}
    </div>
  );
}

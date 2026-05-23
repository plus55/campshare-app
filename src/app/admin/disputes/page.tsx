import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";

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
  const database = await getDb();

  const rows = await database
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
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[1080px]">
        <p className="mb-2 text-sm"><Link href="/admin" className="text-stone hover:text-charcoal">← Admin</Link></p>
        <h1 className="mb-1 font-serif text-3xl text-forest-deep">Disputes</h1>
        <p className="mb-6 text-stone">{openRows.length} active · {closedRows.length} closed</p>

        <h2 className="mb-3 font-serif text-xl text-forest-deep">Active</h2>
        {openRows.length === 0 ? (
          <div className="rounded-2xl border border-line bg-cream p-6 text-sm text-stone">No active disputes.</div>
        ) : (
          <DisputeList rows={openRows} />
        )}

        <h2 className="mb-3 mt-8 font-serif text-xl text-forest-deep">Closed</h2>
        {closedRows.length === 0 ? (
          <div className="rounded-2xl border border-line bg-cream p-6 text-sm text-stone">No closed disputes yet.</div>
        ) : (
          <DisputeList rows={closedRows} />
        )}
      </div>
    </main>
  );
}

function DisputeList({ rows }: { rows: DisputeRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-cream">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {["Van", "Reason", "Initiator", "Status", "Created", ""].map((h) => (
              <th key={h} className="border-b border-line px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-stone">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="hover:bg-sand">
              <td className="px-4 py-2.5 font-medium text-charcoal">{d.vanName}</td>
              <td className="px-4 py-2.5 text-xs text-charcoal-soft">{REASON_LABEL[d.reason] ?? d.reason}</td>
              <td className="px-4 py-2.5">
                <div className="text-charcoal">{d.initiatorName}</div>
                <div className="text-xs text-stone">{d.initiatorEmail}</div>
              </td>
              <td className="px-4 py-2.5">
                <span className="rounded-full bg-sand-warm px-2.5 py-0.5 text-[11px] font-medium text-stone">{d.status}</span>
              </td>
              <td className="px-4 py-2.5 text-xs text-stone">{fmtDate(d.createdAt)}</td>
              <td className="px-4 py-2.5">
                <Link href={`/admin/disputes/${d.id}`} className="text-clay hover:text-clay-deep text-sm">Review →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

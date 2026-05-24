import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";

interface ListingRow {
  id: string;
  name: string;
  vanType: string;
  region: string;
  island: string;
  nightlyRate: number;
  hostFirstName: string;
  hostEmail: string;
  createdAt: number;
}

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function AdminPage() {
  await requireAdmin();
  const database = await getDb();

  const pendingListings = await database
    .prepare(
      `SELECT vl.id, vl.name, vl.vanType, vl.region, vl.island,
              vl.nightlyRate, vl.createdAt,
              hp.firstName AS hostFirstName,
              u.email  AS hostEmail
       FROM van_listing vl
       JOIN host_profile hp ON hp.userId = vl.hostUserId
       JOIN user u ON u.id = vl.hostUserId
       WHERE vl.status = 'pending_review'
       ORDER BY vl.createdAt ASC`
    )
    .all<ListingRow>();

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[1080px]">
        <h1 className="mb-4 font-serif text-3xl text-forest-deep">Admin</h1>

        <div className="mb-6 flex flex-wrap gap-2">
          <Link href="/admin/reports" className="rounded-lg border border-line px-3 py-1.5 text-sm text-charcoal-soft hover:bg-sand transition-colors">Reports queue</Link>
          <Link href="/admin/disputes" className="rounded-lg border border-line px-3 py-1.5 text-sm text-charcoal-soft hover:bg-sand transition-colors">Disputes queue</Link>
        </div>

        <h2 className="mb-1 font-serif text-xl text-forest-deep">Listings awaiting review</h2>
        <p className="mb-4 text-sm text-stone">
          {pendingListings.results.length} listing{pendingListings.results.length === 1 ? "" : "s"} pending
        </p>

        <div className="overflow-x-auto rounded-2xl border border-line bg-cream">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Van", "Type", "Host", "Location", "Rate", "Submitted", ""].map((h) => (
                  <th key={h} scope="col" className="border-b border-line px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-stone">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingListings.results.map((r) => (
                <tr key={r.id} className="hover:bg-sand">
                  <td className="px-4 py-2.5 font-medium text-charcoal">{r.name}</td>
                  <td className="px-4 py-2.5 text-xs text-charcoal-soft">{r.vanType}</td>
                  <td className="px-4 py-2.5">
                    <div className="text-charcoal">{r.hostFirstName}</div>
                    <div className="text-xs text-stone">{r.hostEmail}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-charcoal-soft">{r.region} · {r.island}</td>
                  <td className="px-4 py-2.5 text-charcoal-soft">${Math.round(r.nightlyRate / 100)}/night</td>
                  <td className="px-4 py-2.5 text-xs text-stone">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/listings/${r.id}`} className="text-clay hover:text-clay-deep text-sm">
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
              {pendingListings.results.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone">
                    No listings awaiting review.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

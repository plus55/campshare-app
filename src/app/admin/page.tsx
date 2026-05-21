import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

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
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminPage() {
  await requireAdmin();

  const pendingListings = await db()
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
    <main className="cs-page">
      <div className="cs-container">
        <h1>Admin</h1>

        <h2 style={{ marginTop: 24 }}>Listings awaiting review</h2>
        <p className="cs-muted">
          {pendingListings.results.length} listing{pendingListings.results.length === 1 ? "" : "s"} pending
        </p>

        <div className="cs-card" style={{ marginTop: 16, padding: 16 }}>
          <table className="cs-table">
            <thead>
              <tr>
                <th>Van</th>
                <th>Type</th>
                <th>Host</th>
                <th>Location</th>
                <th>Rate</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendingListings.results.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="cs-small">{r.vanType}</td>
                  <td>
                    <div>{r.hostFirstName}</div>
                    <div className="cs-muted cs-small">{r.hostEmail}</div>
                  </td>
                  <td className="cs-small">{r.region} · {r.island}</td>
                  <td>${Math.round(r.nightlyRate / 100)}/night</td>
                  <td className="cs-muted cs-small">{formatDate(r.createdAt)}</td>
                  <td>
                    <Link href={`/admin/listings/${r.id}`} className="cs-small">
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
              {pendingListings.results.length === 0 && (
                <tr>
                  <td colSpan={7} className="cs-muted" style={{ padding: 24 }}>
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

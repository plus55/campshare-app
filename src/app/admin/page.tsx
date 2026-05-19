import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

interface AdminRow {
  id: string;
  status: "pending" | "approved" | "rejected";
  firstName: string;
  lastName: string;
  email: string;
  vanName: string;
  region: string;
  island: string;
  nightlyRate: number;
  submittedAt: number;
}

export default async function AdminPage() {
  await requireAdmin();

  // Group order: pending first, then approved, then rejected (CASE sort).
  const rows = await db()
    .prepare(
      `SELECT ha.id, ha.status, ha.firstName, ha.lastName,
              u.email AS email, ha.vanName, ha.region, ha.island,
              ha.nightlyRate, ha.submittedAt
       FROM host_application ha
       JOIN user u ON u.id = ha.userId
       ORDER BY
         CASE ha.status
           WHEN 'pending'  THEN 0
           WHEN 'approved' THEN 1
           WHEN 'rejected' THEN 2
         END,
         ha.submittedAt DESC`
    )
    .all<AdminRow>();

  return (
    <main className="cs-page">
      <div className="cs-container">
        <span className="cs-brand">CampShare · Admin</span>
        <h1>Host applications</h1>
        <p className="cs-muted">
          {rows.results.length} application
          {rows.results.length === 1 ? "" : "s"} total
        </p>

        <div className="cs-card" style={{ marginTop: 24, padding: 16 }}>
          <table className="cs-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Applicant</th>
                <th>Email</th>
                <th>Van</th>
                <th>Location</th>
                <th>Rate</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.results.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className={`cs-pill cs-pill-${r.status}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.firstName} {r.lastName}
                  </td>
                  <td className="cs-muted cs-small">{r.email}</td>
                  <td>{r.vanName}</td>
                  <td className="cs-small">
                    {r.region} · {r.island}
                  </td>
                  <td>${r.nightlyRate}</td>
                  <td className="cs-muted cs-small">
                    {formatDate(r.submittedAt)}
                  </td>
                  <td>
                    <Link
                      href={`/admin/applications/${r.id}`}
                      className="cs-small"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.results.length === 0 && (
                <tr>
                  <td colSpan={8} className="cs-muted" style={{ padding: 24 }}>
                    No applications yet.
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

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { HostProfile, VanListing } from "@/lib/types";

interface ListingRow {
  id: string;
  name: string;
  status: VanListing["status"];
  nightlyRate: number;
  region: string;
  createdAt: number;
}

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = (session.user.name ?? "").split(" ")[0] || "there";

  const profile = await db()
    .prepare("SELECT * FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<HostProfile>();

  const listingsResult = profile
    ? await db()
        .prepare(
          `SELECT id, name, status, nightlyRate, region, createdAt
           FROM van_listing WHERE hostUserId = ? ORDER BY createdAt DESC`
        )
        .bind(session.user.id)
        .all<ListingRow>()
    : null;

  const listings = listingsResult?.results ?? [];

  return (
    <main className="cs-page">
      <div className="cs-container">
        <span className="cs-brand">CampShare</span>
        <h1>Kia ora, {firstName}.</h1>
        <p className="cs-muted">Welcome to your CampShare dashboard.</p>

        <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
          {!profile ? (
            <div className="cs-card">
              <h2>Set up your host profile</h2>
              <p>Before you can list a van, we need a few details about you.</p>
              <Link href="/dashboard/profile" className="cs-btn cs-btn-primary">
                Create host profile
              </Link>
            </div>
          ) : (
            <>
              <div className="cs-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Your listings</h2>
                    {listings.length === 0 && (
                      <p className="cs-muted" style={{ marginTop: 8 }}>
                        No listings yet. Add your first van to get started.
                      </p>
                    )}
                  </div>
                  <Link href="/dashboard/listings/new" className="cs-btn cs-btn-primary">
                    + New listing
                  </Link>
                </div>

                {listings.length > 0 && (
                  <table className="cs-table" style={{ marginTop: 16 }}>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Name</th>
                        <th>Location</th>
                        <th>Rate / night</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <span className={`cs-pill cs-pill-${l.status === "pending_review" ? "pending" : l.status}`}>
                              {l.status === "pending_review" ? "in review" : l.status}
                            </span>
                          </td>
                          <td>{l.name}</td>
                          <td className="cs-muted cs-small">{l.region}</td>
                          <td>${(l.nightlyRate / 100).toFixed(0)}/night</td>
                          <td>
                            <Link href={`/dashboard/listings/${l.id}`} className="cs-small">
                              Edit →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="cs-card">
                <h2>Host profile</h2>
                <p className="cs-muted cs-small">
                  {profile.firstName} {profile.lastName} · {profile.region}
                </p>
                {profile.bio && <p className="cs-small">{profile.bio}</p>}
                <Link href="/dashboard/profile" className="cs-btn cs-btn-ghost" style={{ marginTop: 12, display: "inline-block" }}>
                  Edit profile
                </Link>
              </div>
            </>
          )}

          {profile && (
            <div className="cs-card">
              <h2>Bookings</h2>
              <p className="cs-muted cs-small">View and respond to booking requests on your listings.</p>
              <Link href="/dashboard/bookings" className="cs-btn cs-btn-ghost" style={{ marginTop: 12, display: "inline-block" }}>
                View bookings
              </Link>
            </div>
          )}

          <div className="cs-card">
            <h2>My trips</h2>
            <p>Your van bookings across Aotearoa.</p>
            <Link href="/trips" className="cs-btn cs-btn-ghost" style={{ display: "inline-block" }}>
              View trips
            </Link>
          </div>

          <div className="cs-card">
            <h2>Find a van</h2>
            <p>Browse self-contained campers across Aotearoa.</p>
            <Link href="/vans" className="cs-btn cs-btn-ghost">
              Browse vans
            </Link>
          </div>

          <div className="cs-card">
            <h2>Profile</h2>
            <p className="cs-muted cs-small">{session.user.name}</p>
            <p className="cs-muted cs-small">{session.user.email}</p>
            <form action="/api/auth/sign-out" method="post" style={{ marginTop: 12 }}>
              <button type="submit" className="cs-btn cs-btn-ghost">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

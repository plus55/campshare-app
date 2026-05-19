import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";

interface ApplicationRow {
  id: string;
  status: "pending" | "approved" | "rejected";
  vanName: string;
  adminNote: string | null;
}

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = (session.user.name ?? "").split(" ")[0] || "there";

  const app = await db()
    .prepare(
      "SELECT id, status, vanName, adminNote " +
        "FROM host_application WHERE userId = ? " +
        "ORDER BY submittedAt DESC LIMIT 1"
    )
    .bind(session.user.id)
    .first<ApplicationRow>();

  return (
    <main className="cs-page">
      <div className="cs-container">
        <span className="cs-brand">CampShare</span>
        <h1>Kia ora, {firstName}.</h1>
        <p className="cs-muted">Welcome to your CampShare dashboard.</p>

        <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
          <ApplicationCard app={app} />
          <FindVanCard />
          <ProfileCard
            name={session.user.name ?? ""}
            email={session.user.email}
          />
        </div>
      </div>
    </main>
  );
}

function ApplicationCard({ app }: { app: ApplicationRow | null }) {
  if (!app) {
    return (
      <div className="cs-card">
        <h2>List your van</h2>
        <p>
          Earn while you&apos;re not using your campervan. Start your host
          application — it takes about 5 minutes.
        </p>
        <Link href="/apply" className="cs-btn cs-btn-primary">
          Start application
        </Link>
      </div>
    );
  }

  if (app.status === "pending") {
    return (
      <div className="cs-card">
        <span className="cs-pill cs-pill-pending">Under review</span>
        <h2 style={{ marginTop: 12 }}>Your host application</h2>
        <p>
          Thanks for applying with <strong>{app.vanName}</strong>. We&apos;ll be
          in touch within 1–2 business days.
        </p>
      </div>
    );
  }

  if (app.status === "approved") {
    return (
      <div className="cs-card">
        <span className="cs-pill cs-pill-approved">Approved</span>
        <h2 style={{ marginTop: 12 }}>Welcome aboard</h2>
        <p>
          <strong>{app.vanName}</strong> has been approved. Soon you&apos;ll be
          able to manage your listing, photos and calendar from here.
        </p>
        <Link href="#" className="cs-btn cs-btn-ghost">
          Manage van (coming soon)
        </Link>
      </div>
    );
  }

  return (
    <div className="cs-card">
      <span className="cs-pill cs-pill-rejected">Not approved</span>
      <h2 style={{ marginTop: 12 }}>Your host application</h2>
      <p>
        Unfortunately we weren&apos;t able to approve <strong>{app.vanName}</strong>{" "}
        at this time.
      </p>
      {app.adminNote && (
        <p className="cs-muted cs-small">
          <strong>Note from our team:</strong> {app.adminNote}
        </p>
      )}
    </div>
  );
}

function FindVanCard() {
  return (
    <div className="cs-card">
      <h2>Find a van</h2>
      <p>Browse self-contained campers across Aotearoa.</p>
      <a
        href="https://www.campshare.co.nz/browse"
        className="cs-btn cs-btn-ghost"
      >
        Browse vans
      </a>
    </div>
  );
}

function ProfileCard({ name, email }: { name: string; email: string }) {
  return (
    <div className="cs-card">
      <h2>Profile</h2>
      <p className="cs-muted cs-small">{name}</p>
      <p className="cs-muted cs-small">{email}</p>
      <form action="/api/auth/sign-out" method="post" style={{ marginTop: 12 }}>
        <button type="submit" className="cs-btn cs-btn-ghost">
          Sign out
        </button>
      </form>
    </div>
  );
}

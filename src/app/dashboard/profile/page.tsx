import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { HostProfile } from "@/lib/types";
import EditProfileForm from "./EditProfileForm";

export default async function ProfilePage() {
  const session = await requireSession();

  const profile = await db()
    .prepare("SELECT * FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<HostProfile>();

  return (
    <main className="cs-page">
      <div className="cs-narrow">
        <h1>{profile ? "Edit profile" : "Create host profile"}</h1>
        <p className="cs-muted">Your public host information shown on listing pages.</p>
        <div style={{ marginTop: 24 }}>
          <EditProfileForm profile={profile} />
        </div>
      </div>
    </main>
  );
}

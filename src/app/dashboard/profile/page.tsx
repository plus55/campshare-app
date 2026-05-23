import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { HostProfile } from "@/lib/types";
import EditProfileForm from "./EditProfileForm";
import KycCard from "./KycCard";

type KycStatus = "unverified" | "pending" | "verified" | "failed";

export default async function ProfilePage() {
  const session = await requireSession();

  const [profile, userRow] = await Promise.all([
    db()
      .prepare("SELECT * FROM host_profile WHERE userId = ?")
      .bind(session.user.id)
      .first<HostProfile>(),
    db()
      .prepare("SELECT kycStatus FROM user WHERE id = ?")
      .bind(session.user.id)
      .first<{ kycStatus: KycStatus }>(),
  ]);

  const kycStatus: KycStatus = userRow?.kycStatus ?? "unverified";

  return (
    <main className="cs-page">
      <div className="cs-narrow">
        <h1>{profile ? "Edit profile" : "Create host profile"}</h1>
        <p className="cs-muted">Your public host information shown on listing pages.</p>
        <div style={{ marginTop: 24 }}>
          <KycCard kycStatus={kycStatus} />
          <EditProfileForm profile={profile} />
        </div>
      </div>
    </main>
  );
}

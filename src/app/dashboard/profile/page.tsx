import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import type { HostProfile } from "@/lib/types";
import EditProfileForm from "./EditProfileForm";
import KycCard from "./KycCard";

type KycStatus = "unverified" | "pending" | "verified" | "failed";

export default async function ProfilePage() {
  const session = await requireSession();
  const database = await getDb();

  const [profile, userRow] = await Promise.all([
    database
      .prepare("SELECT * FROM host_profile WHERE userId = ?")
      .bind(session.user.id)
      .first<HostProfile>(),
    database
      .prepare("SELECT kycStatus FROM user WHERE id = ?")
      .bind(session.user.id)
      .first<{ kycStatus: KycStatus }>(),
  ]);

  const kycStatus: KycStatus = userRow?.kycStatus ?? "unverified";

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[460px]">
        <h1 className="mb-1 font-serif text-3xl text-forest-deep dark:text-cream">
          {profile ? "Edit profile" : "Create host profile"}
        </h1>
        <p className="mb-6 text-muted-foreground">Your public host information shown on listing pages.</p>
        <div className="flex flex-col gap-4">
          <KycCard kycStatus={kycStatus} />
          <EditProfileForm profile={profile} />
        </div>
      </div>
    </main>
  );
}

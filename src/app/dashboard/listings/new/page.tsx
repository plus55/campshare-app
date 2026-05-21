import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import ListingForm from "../ListingForm";

export default async function NewListingPage() {
  const session = await requireSession();

  const profile = await db()
    .prepare("SELECT userId FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<{ userId: string }>();

  if (!profile) redirect("/dashboard/profile");

  return (
    <main className="cs-page">
      <div className="cs-narrow">
        <h1>New listing</h1>
        <p className="cs-muted">Tell travellers about your van.</p>
        <div style={{ marginTop: 24 }}>
          <ListingForm listing={null} />
        </div>
      </div>
    </main>
  );
}

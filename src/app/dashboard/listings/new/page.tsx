import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import ListingForm from "../ListingForm";

export default async function NewListingPage() {
  const session = await requireSession();
  const database = await getDb();

  const profile = await database
    .prepare("SELECT userId FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<{ userId: string }>();

  if (!profile) redirect("/dashboard/profile");

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[720px]">
        <p className="mb-2 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">← Dashboard</Link>
        </p>
        <h1 className="mb-1 font-serif text-3xl text-forest-deep dark:text-cream">New listing</h1>
        <p className="mb-6 text-muted-foreground">Tell travellers about your van.</p>
        <ListingForm listing={null} />
      </div>
    </main>
  );
}

import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { MAX_TEMPLATES_PER_HOST } from "@/lib/constants";
import type { MessageTemplate } from "@/lib/types";
import { TemplateManager } from "./TemplateManager";

export default async function TemplatesPage() {
  const session = await requireSession();
  const database = await getDb();

  const { results } = await database
    .prepare(
      "SELECT id, userId, title, body, position, createdAt, updatedAt FROM message_template WHERE userId = ? ORDER BY position ASC, createdAt ASC"
    )
    .bind(session.user.id)
    .all<MessageTemplate>();

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[720px]">
        <p className="mb-2 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">← Dashboard</Link>
        </p>
        <h1 className="mb-1 font-serif text-3xl text-forest-deep dark:text-cream">Message templates</h1>
        <p className="mb-6 text-muted-foreground">
          Save the answers you give guests over and over — pickup directions, bedding, refundable bond.
          Tap a template when replying to a booking to drop it into the message box.
          Up to {MAX_TEMPLATES_PER_HOST} templates.
        </p>

        <TemplateManager initial={results ?? []} />
      </div>
    </main>
  );
}

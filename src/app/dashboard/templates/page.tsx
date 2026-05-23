import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { MAX_TEMPLATES_PER_HOST } from "@/lib/constants";
import type { MessageTemplate } from "@/lib/types";
import { TemplateManager } from "./TemplateManager";

export default async function TemplatesPage() {
  const session = await requireSession();

  const { results } = await db()
    .prepare(
      "SELECT id, userId, title, body, position, createdAt, updatedAt FROM message_template WHERE userId = ? ORDER BY position ASC, createdAt ASC"
    )
    .bind(session.user.id)
    .all<MessageTemplate>();

  return (
    <main className="cs-page">
      <div className="cs-container" style={{ maxWidth: 720 }}>
        <p className="cs-small" style={{ margin: "0 0 8px" }}>
          <Link href="/dashboard" className="cs-muted">← Dashboard</Link>
        </p>
        <h1 style={{ marginBottom: 4 }}>Message templates</h1>
        <p className="cs-muted">
          Save the answers you give guests over and over — pickup directions, bedding, refundable bond.
          Tap a template when replying to a booking to drop it into the message box.
          Up to {MAX_TEMPLATES_PER_HOST} templates.
        </p>

        <TemplateManager initial={results ?? []} />
      </div>
    </main>
  );
}

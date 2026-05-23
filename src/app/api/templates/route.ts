import { type NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import {
  MAX_TEMPLATES_PER_HOST,
  TEMPLATE_BODY_MAX,
  TEMPLATE_TITLE_MAX,
} from "@/lib/constants";
import type { MessageTemplate } from "@/lib/types";

export async function GET() {
  const session = await requireSession();
  const { results } = await db()
    .prepare(
      "SELECT id, userId, title, body, position, createdAt, updatedAt FROM message_template WHERE userId = ? ORDER BY position ASC, createdAt ASC"
    )
    .bind(session.user.id)
    .all<MessageTemplate>();
  return NextResponse.json({ templates: results });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json().catch(() => null) as { title?: unknown; body?: unknown } | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const text = typeof body?.body === "string" ? body.body.trim() : "";

  if (!title || title.length > TEMPLATE_TITLE_MAX) {
    return NextResponse.json({ error: `Title is required (max ${TEMPLATE_TITLE_MAX} chars)` }, { status: 400 });
  }
  if (!text || text.length > TEMPLATE_BODY_MAX) {
    return NextResponse.json({ error: `Body is required (max ${TEMPLATE_BODY_MAX} chars)` }, { status: 400 });
  }

  const countRow = await db()
    .prepare("SELECT COUNT(*) AS n FROM message_template WHERE userId = ?")
    .bind(session.user.id)
    .first<{ n: number }>();
  if ((countRow?.n ?? 0) >= MAX_TEMPLATES_PER_HOST) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_TEMPLATES_PER_HOST} templates.` },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const nowSec = Math.floor(Date.now() / 1000);
  const position = countRow?.n ?? 0;

  await db()
    .prepare(
      "INSERT INTO message_template (id, userId, title, body, position, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id, session.user.id, title, text, position, nowSec, nowSec)
    .run();

  const tpl: MessageTemplate = {
    id, userId: session.user.id, title, body: text, position,
    createdAt: nowSec, updatedAt: nowSec,
  };
  return NextResponse.json(tpl);
}

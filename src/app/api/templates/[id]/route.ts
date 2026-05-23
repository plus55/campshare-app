import { type NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { TEMPLATE_BODY_MAX, TEMPLATE_TITLE_MAX } from "@/lib/constants";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const owns = await db()
    .prepare("SELECT id FROM message_template WHERE id = ? AND userId = ?")
    .bind(id, session.user.id)
    .first<{ id: string }>();
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null) as
    | { title?: unknown; body?: unknown; position?: unknown }
    | null;

  const sets: string[] = [];
  const binds: unknown[] = [];

  if (typeof body?.title === "string") {
    const t = body.title.trim();
    if (!t || t.length > TEMPLATE_TITLE_MAX) {
      return NextResponse.json({ error: `Title is required (max ${TEMPLATE_TITLE_MAX} chars)` }, { status: 400 });
    }
    sets.push("title = ?"); binds.push(t);
  }

  if (typeof body?.body === "string") {
    const b = body.body.trim();
    if (!b || b.length > TEMPLATE_BODY_MAX) {
      return NextResponse.json({ error: `Body is required (max ${TEMPLATE_BODY_MAX} chars)` }, { status: 400 });
    }
    sets.push("body = ?"); binds.push(b);
  }

  if (typeof body?.position === "number" && Number.isInteger(body.position) && body.position >= 0) {
    sets.push("position = ?"); binds.push(body.position);
  }

  if (sets.length === 0) return NextResponse.json({ ok: true });

  sets.push("updatedAt = ?"); binds.push(Math.floor(Date.now() / 1000));
  binds.push(id, session.user.id);

  await db()
    .prepare(`UPDATE message_template SET ${sets.join(", ")} WHERE id = ? AND userId = ?`)
    .bind(...binds)
    .run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  await db()
    .prepare("DELETE FROM message_template WHERE id = ? AND userId = ?")
    .bind(id, session.user.id)
    .run();
  return NextResponse.json({ ok: true });
}

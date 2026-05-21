import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);

  const { results } = await db()
    .prepare(
      `SELECT id, type, payload, readAt, createdAt
       FROM notification
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT ?`
    )
    .bind(session.user.id, limit)
    .all<{ id: string; type: string; payload: string; readAt: number | null; createdAt: number }>();

  const items = (results ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    payload: JSON.parse(r.payload) as Record<string, unknown>,
    readAt: r.readAt,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({ items });
}

// Mark notifications as read
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nowSec = Math.floor(Date.now() / 1000);
  const body = await req.json().catch(() => ({})) as { ids?: string[] };

  if (body.ids && body.ids.length > 0) {
    // Mark specific notifications
    const placeholders = body.ids.map(() => "?").join(", ");
    await db()
      .prepare(
        `UPDATE notification SET readAt = ? WHERE userId = ? AND id IN (${placeholders}) AND readAt IS NULL`
      )
      .bind(nowSec, session.user.id, ...body.ids)
      .run();
  } else {
    // Mark all unread
    await db()
      .prepare("UPDATE notification SET readAt = ? WHERE userId = ? AND readAt IS NULL")
      .bind(nowSec, session.user.id)
      .run();
  }

  return NextResponse.json({ ok: true });
}

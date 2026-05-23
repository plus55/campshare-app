import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const schema = z.object({
  blockedUserId: z.string().min(1),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Invalid payload");

  const { blockedUserId } = parsed.data;
  if (blockedUserId === session.user.id) return bad("Cannot block yourself");

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  try {
    await db()
      .prepare(
        "INSERT INTO user_block (id, blockerUserId, blockedUserId, createdAt) VALUES (?, ?, ?, ?)"
      )
      .bind(id, session.user.id, blockedUserId, now)
      .run();
  } catch {
    // UNIQUE constraint — already blocked, treat as idempotent
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const url = new URL(req.url);
  const blockedUserId = url.searchParams.get("blockedUserId");
  if (!blockedUserId) return bad("Missing blockedUserId");

  await db()
    .prepare("DELETE FROM user_block WHERE blockerUserId = ? AND blockedUserId = ?")
    .bind(session.user.id, blockedUserId)
    .run();

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const rows = await db()
    .prepare(
      `SELECT ub.blockedUserId, u.name AS blockedName, ub.createdAt
       FROM user_block ub
       JOIN user u ON u.id = ub.blockedUserId
       WHERE ub.blockerUserId = ?
       ORDER BY ub.createdAt DESC`
    )
    .bind(session.user.id)
    .all<{ blockedUserId: string; blockedName: string; createdAt: number }>();

  return NextResponse.json(rows.results);
}

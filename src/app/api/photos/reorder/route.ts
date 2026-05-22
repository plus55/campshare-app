import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const schema = z.object({
  vanListingId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1).max(10),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { vanListingId, orderedIds } = parsed.data;

  const listing = await db()
    .prepare("SELECT id FROM van_listing WHERE id = ? AND hostUserId = ?")
    .bind(vanListingId, session.user.id)
    .first<{ id: string }>();
  if (!listing) return bad("Not found", 404);

  const placeholders = orderedIds.map(() => "?").join(", ");
  const existing = await db()
    .prepare(`SELECT id FROM van_photo WHERE vanListingId = ? AND id IN (${placeholders})`)
    .bind(vanListingId, ...orderedIds)
    .all<{ id: string }>();
  if (existing.results.length !== orderedIds.length) {
    return bad("Photo set mismatch");
  }

  const stmts = orderedIds.map((id, idx) =>
    db().prepare("UPDATE van_photo SET position = ? WHERE id = ?").bind(idx, id)
  );
  await db().batch(stmts);

  return NextResponse.json({ ok: true });
}

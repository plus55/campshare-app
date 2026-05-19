import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id, blockId } = await params;

  const block = await db()
    .prepare(
      `SELECT ab.id FROM availability_block ab
       JOIN van_listing vl ON vl.id = ab.vanListingId
       WHERE ab.id = ? AND vl.id = ? AND vl.hostUserId = ?`
    )
    .bind(blockId, id, session.user.id)
    .first<{ id: string }>();

  if (!block) return bad("Not found", 404);

  await db().prepare("DELETE FROM availability_block WHERE id = ?").bind(blockId).run();

  return NextResponse.json({ ok: true });
}

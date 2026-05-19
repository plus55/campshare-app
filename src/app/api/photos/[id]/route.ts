import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const patchSchema = z.object({
  caption: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function ownsPhoto(photoId: string, userId: string) {
  return db()
    .prepare(
      `SELECT vp.id FROM van_photo vp
       JOIN van_listing vl ON vl.id = vp.vanListingId
       WHERE vp.id = ? AND vl.hostUserId = ?`
    )
    .bind(photoId, userId)
    .first<{ id: string }>();
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id } = await params;

  const photo = await ownsPhoto(id, session.user.id);
  if (!photo) return bad("Not found", 404);

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { caption, position } = parsed.data;
  const sets: string[] = [];
  const binds: unknown[] = [];

  if (caption !== undefined) { sets.push("caption = ?"); binds.push(caption || null); }
  if (position !== undefined) { sets.push("position = ?"); binds.push(position); }

  if (sets.length === 0) return NextResponse.json({ ok: true });

  binds.push(id);
  await db().prepare(`UPDATE van_photo SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id } = await params;

  const photo = await ownsPhoto(id, session.user.id);
  if (!photo) return bad("Not found", 404);

  await db().prepare("DELETE FROM van_photo WHERE id = ?").bind(id).run();

  return NextResponse.json({ ok: true });
}

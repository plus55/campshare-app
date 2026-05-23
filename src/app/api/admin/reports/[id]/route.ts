import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["reviewed", "actioned", "dismissed"]),
  adminNote: z.string().max(2000).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const { status, adminNote } = parsed.data;
  const now = Math.floor(Date.now() / 1000);

  const existing = await db()
    .prepare("SELECT id FROM user_report WHERE id = ?")
    .bind(id)
    .first<{ id: string }>();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db()
    .prepare("UPDATE user_report SET status = ?, adminNote = ?, resolvedAt = ? WHERE id = ?")
    .bind(status, adminNote ?? null, now, id)
    .run();

  await logAudit({
    actorUserId: session.user.id,
    action: `report_${status}`,
    targetType: "user_report",
    targetId: id,
    metadata: { adminNote: adminNote ?? null },
  });

  return NextResponse.json({ ok: true });
}

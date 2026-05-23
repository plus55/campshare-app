import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["under_review", "resolved_host", "resolved_guest", "resolved_split", "dismissed"]),
  adminNote: z.string().max(4000).optional().nullable(),
  depositAction: z.enum(["released_to_host", "returned_to_guest", "split"]).optional().nullable(),
  depositSplitToHostCents: z.number().int().min(0).optional().nullable(),
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

  const { status, adminNote, depositAction, depositSplitToHostCents } = parsed.data;

  const existing = await db()
    .prepare("SELECT id, status FROM dispute WHERE id = ?")
    .bind(id)
    .first<{ id: string; status: string }>();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isResolution = ["resolved_host", "resolved_guest", "resolved_split", "dismissed"].includes(status);
  const now = Math.floor(Date.now() / 1000);

  await db()
    .prepare(
      `UPDATE dispute
       SET status = ?, adminNote = ?, depositAction = ?, depositSplitToHostCents = ?, resolvedAt = ?
       WHERE id = ?`
    )
    .bind(
      status,
      adminNote ?? null,
      depositAction ?? null,
      depositSplitToHostCents ?? null,
      isResolution ? now : null,
      id
    )
    .run();

  await logAudit({
    actorUserId: session.user.id,
    action: `dispute_${status}`,
    targetType: "dispute",
    targetId: id,
    metadata: { depositAction: depositAction ?? null, depositSplitToHostCents: depositSplitToHostCents ?? null, adminNote: adminNote ?? null },
  });

  return NextResponse.json({ ok: true });
}

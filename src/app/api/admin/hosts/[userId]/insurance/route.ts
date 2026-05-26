import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendBrandedEmail } from "@/lib/email";

const schema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().max(4000).optional().nullable(),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireAdmin();
  const { userId } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");
  const { decision, note } = parsed.data;

  const host = await db()
    .prepare(
      `SELECT hp.userId, hp.firstName, hp.insuranceStatus, hp.insuranceProvider, u.email AS hostEmail
       FROM host_profile hp JOIN user u ON u.id = hp.userId
       WHERE hp.userId = ?`,
    )
    .bind(userId)
    .first<{ userId: string; firstName: string; insuranceStatus: string; insuranceProvider: string | null; hostEmail: string }>();
  if (!host) return bad("Host not found", 404);

  if (decision === "reject" && !note?.trim()) {
    return bad("A note is required when rejecting so the host knows what to fix");
  }

  const now = Math.floor(Date.now() / 1000);

  if (decision === "approve") {
    await db()
      .prepare(
        `UPDATE host_profile
           SET insuranceStatus = 'verified', insuranceVerifiedAt = ?, insuranceAdminNote = ?, updatedAt = ?
         WHERE userId = ?`,
      )
      .bind(now, note ?? null, now, userId)
      .run();
  } else {
    await db()
      .prepare(
        `UPDATE host_profile
           SET insuranceStatus = 'rejected', insuranceVerifiedAt = NULL, insuranceAdminNote = ?, updatedAt = ?
         WHERE userId = ?`,
      )
      .bind(note ?? null, now, userId)
      .run();
  }

  await logAudit({
    actorUserId: session.user.id,
    action: `insurance_${decision}`,
    targetType: "host_profile",
    targetId: userId,
    metadata: { provider: host.insuranceProvider, note: note ?? null },
  });

  const appUrl = process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";
  try {
    await sendBrandedEmail({
      to: host.hostEmail,
      subject: decision === "approve" ? "Your hire insurance is verified" : "Your hire insurance needs attention",
      heading: decision === "approve" ? "Insurance verified" : "Insurance not yet verified",
      intro:
        decision === "approve"
          ? `Thanks ${host.firstName} — your policy is verified and your listings can now go live.`
          : `Hi ${host.firstName}, we couldn't verify your policy. ${note ?? ""}`.trim(),
      cta: { label: "View insurance", href: `${appUrl}/dashboard/profile` },
    });
  } catch (e) {
    console.error("Failed to send insurance decision email", e);
  }

  return NextResponse.json({ ok: true });
}

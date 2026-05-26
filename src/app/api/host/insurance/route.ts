import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { sendBrandedEmail } from "@/lib/email";

const schema = z.object({
  provider: z.string().trim().min(2).max(120),
  policyNumber: z.string().trim().min(2).max(80),
  coverType: z.enum(["p2p_rental", "commercial_fleet", "self_attested"]),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry must be a valid date"),
  docR2Key: z.string().trim().min(1).max(300),
  attested: z.literal(true, { message: "You must confirm your policy permits paid hire" }),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const profile = await db()
    .prepare("SELECT userId FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<{ userId: string }>();
  if (!profile) return bad("Create a host profile before adding insurance", 404);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { provider, policyNumber, coverType, expiryDate, docR2Key } = parsed.data;

  // Reject keys not in this host's private namespace (defends against tampering).
  if (!docR2Key.startsWith(`host-docs/${session.user.id}/`)) {
    return bad("Invalid document reference");
  }

  const expirySec = Math.floor(Date.parse(`${expiryDate}T00:00:00Z`) / 1000);
  const nowSec = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(expirySec)) return bad("Expiry must be a valid date");
  if (expirySec <= nowSec) return bad("Policy expiry must be in the future");

  await db()
    .prepare(
      `UPDATE host_profile
         SET insuranceStatus = 'pending',
             insuranceProvider = ?,
             insurancePolicyNumber = ?,
             insuranceCoverType = ?,
             insuranceExpiryDate = ?,
             insuranceDocR2Key = ?,
             insuranceAttestedAt = ?,
             insuranceAdminNote = NULL,
             updatedAt = ?
       WHERE userId = ?`,
    )
    .bind(provider, policyNumber, coverType, expirySec, docR2Key, nowSec, nowSec, session.user.id)
    .run();

  const appUrl = process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";
  const admin = process.env.ADMIN_EMAIL ?? "jontydavies7@gmail.com";
  try {
    await sendBrandedEmail({
      to: admin,
      subject: "Host insurance submitted for review",
      heading: "Insurance awaiting review",
      intro: `${session.user.name ?? session.user.email} submitted a ${provider} policy for verification.`,
      cta: { label: "Review insurance", href: `${appUrl}/admin/insurance/${session.user.id}` },
    });
  } catch (e) {
    console.error("Failed to send admin insurance notification", e);
  }

  return NextResponse.json({ ok: true, status: "pending" });
}

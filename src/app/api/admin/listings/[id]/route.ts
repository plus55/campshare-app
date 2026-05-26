import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { sendBrandedEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { isInsuranceCurrent } from "@/lib/insurance";
import type { InsuranceStatus } from "@/lib/types";

const schema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().optional().nullable(),
});

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const admin = process.env.ADMIN_EMAIL ?? "jontydavies7@gmail.com";
  if (session.user.email !== admin) return bad("Forbidden", 403);

  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid payload");

  const { decision, note } = parsed.data;
  const noteVal = note?.trim() || null;
  const now = Math.floor(Date.now() / 1000);

  const row = await db()
    .prepare(
      `SELECT vl.id, vl.name, vl.status,
              hp.firstName, hp.insuranceStatus, hp.insuranceExpiryDate, u.email
       FROM van_listing vl
       JOIN host_profile hp ON hp.userId = vl.hostUserId
       JOIN user u ON u.id = vl.hostUserId
       WHERE vl.id = ?`
    )
    .bind(id)
    .first<{ id: string; name: string; status: string; firstName: string; insuranceStatus: InsuranceStatus; insuranceExpiryDate: number | null; email: string }>();

  if (!row) return bad("Listing not found", 404);
  if (row.status !== "pending_review") return bad("Listing is not pending review");

  const appUrl = process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";

  if (decision === "approve") {
    if (!isInsuranceCurrent(row)) {
      return bad("Cannot publish: this host has no verified, in-date hire insurance on file.", 409);
    }
    await db()
      .prepare(
        `UPDATE van_listing SET status = 'published', publishedAt = ?, adminNote = ?, updatedAt = ? WHERE id = ?`
      )
      .bind(now, noteVal, now, id)
      .run();

    await logAudit({
      actorUserId: session.user.id,
      action: "listing.approve",
      targetType: "van_listing",
      targetId: id,
      metadata: { name: row.name, note: noteVal },
    });

    try {
      await sendBrandedEmail({
        to: row.email,
        subject: `${row.name} is live on CampShare`,
        heading: "Your listing is live",
        intro: `Kia ora ${row.firstName}, "${row.name}" has been approved and is now visible to travellers on CampShare.`,
        cta: { label: "View listing", href: `${appUrl}/vans/${id}` },
        body: noteVal ? `<p><em>${escapeHtml(noteVal)}</em></p>` : undefined,
      });
    } catch (e) {
      console.error("Failed to send host approval email", e);
    }
  } else {
    await db()
      .prepare(
        `UPDATE van_listing SET status = 'draft', adminNote = ?, updatedAt = ? WHERE id = ?`
      )
      .bind(noteVal, now, id)
      .run();

    await logAudit({
      actorUserId: session.user.id,
      action: "listing.reject",
      targetType: "van_listing",
      targetId: id,
      metadata: { name: row.name, note: noteVal },
    });

    try {
      await sendBrandedEmail({
        to: row.email,
        subject: `Update on your CampShare listing`,
        heading: "About your listing",
        intro: `Kia ora ${row.firstName}, we weren't able to approve "${row.name}" at this time.`,
        cta: { label: "Edit listing", href: `${appUrl}/dashboard/listings/${id}` },
        body: noteVal ? `<p><strong>Note from the team:</strong><br>${escapeHtml(noteVal)}</p>` : undefined,
      });
    } catch (e) {
      console.error("Failed to send host rejection email", e);
    }
  }

  return NextResponse.json({ ok: true, status: decision === "approve" ? "published" : "draft" });
}

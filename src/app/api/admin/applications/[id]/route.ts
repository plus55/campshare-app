import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { sendBrandedEmail } from "@/lib/email";

interface Body {
  decision: "approve" | "reject";
  note?: string | null;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("Invalid JSON");
  }
  if (body.decision !== "approve" && body.decision !== "reject") {
    return bad("decision must be 'approve' or 'reject'");
  }

  const status = body.decision === "approve" ? "approved" : "rejected";
  const note = body.note?.trim() || null;
  const now = Math.floor(Date.now() / 1000);

  // Fetch applicant info to send the email.
  const row = await db()
    .prepare(
      `SELECT ha.id, ha.vanName, ha.firstName, u.email AS email
       FROM host_application ha
       JOIN user u ON u.id = ha.userId
       WHERE ha.id = ?`
    )
    .bind(id)
    .first<{
      id: string;
      vanName: string;
      firstName: string;
      email: string;
    }>();

  if (!row) return bad("Application not found", 404);

  await db()
    .prepare(
      `UPDATE host_application
       SET status = ?, adminNote = ?, reviewedAt = ?
       WHERE id = ?`
    )
    .bind(status, note, now, id)
    .run();

  // Notify the applicant.
  try {
    if (status === "approved") {
      await sendBrandedEmail({
        to: row.email,
        subject: `${row.vanName} is approved on CampShare`,
        heading: "You're in",
        intro:
          `Kia ora ${row.firstName}, we've approved ${row.vanName} on ` +
          `CampShare. Soon you'll be able to add photos, set your calendar ` +
          `and start receiving bookings.`,
        cta: {
          label: "Go to dashboard",
          href: `${process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz"}/dashboard`,
        },
        body: note ? `<p><em>${escapeHtml(note)}</em></p>` : undefined,
      });
    } else {
      await sendBrandedEmail({
        to: row.email,
        subject: `Update on your CampShare host application`,
        heading: "About your application",
        intro:
          `Kia ora ${row.firstName}, thanks for applying to list ${row.vanName} ` +
          `on CampShare. Unfortunately, we weren't able to approve your ` +
          `application at this time.`,
        body: note
          ? `<p><strong>Note from the team:</strong><br>${escapeHtml(note)}</p>`
          : undefined,
      });
    }
  } catch (e) {
    console.error("Failed to send applicant email", e);
  }

  return NextResponse.json({ id, status });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

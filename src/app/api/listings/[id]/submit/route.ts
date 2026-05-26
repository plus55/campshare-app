import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { sendBrandedEmail } from "@/lib/email";
import { INSURANCE_GATE_MESSAGE, isInsuranceCurrent } from "@/lib/insurance";
import type { InsuranceStatus } from "@/lib/types";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const { id } = await params;

  const listing = await db()
    .prepare(
      `SELECT vl.id, vl.name, vl.status, vl.hostUserId,
              hp.firstName, hp.insuranceStatus, hp.insuranceExpiryDate
       FROM van_listing vl
       JOIN host_profile hp ON hp.userId = vl.hostUserId
       WHERE vl.id = ? AND vl.hostUserId = ?`
    )
    .bind(id, session.user.id)
    .first<{ id: string; name: string; status: string; hostUserId: string; firstName: string; insuranceStatus: InsuranceStatus; insuranceExpiryDate: number | null }>();

  if (!listing) return bad("Not found", 404);
  if (!["draft", "paused"].includes(listing.status)) {
    return bad("Only draft or paused listings can be submitted for review.");
  }
  if (!isInsuranceCurrent(listing)) {
    return bad(INSURANCE_GATE_MESSAGE, 403);
  }

  const now = Math.floor(Date.now() / 1000);
  await db()
    .prepare("UPDATE van_listing SET status = 'pending_review', updatedAt = ? WHERE id = ?")
    .bind(now, id)
    .run();

  const appUrl = process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";
  const admin = process.env.ADMIN_EMAIL ?? "jontydavies7@gmail.com";

  try {
    await sendBrandedEmail({
      to: admin,
      subject: `New listing for review: ${listing.name}`,
      heading: "New listing submitted",
      intro: `${listing.firstName} has submitted "${listing.name}" for review.`,
      cta: { label: "Review listing", href: `${appUrl}/admin/listings/${id}` },
    });
  } catch (e) {
    console.error("Failed to send admin notification", e);
  }

  return NextResponse.json({ ok: true, status: "pending_review" });
}

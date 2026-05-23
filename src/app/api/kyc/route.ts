import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

interface UserKycRow {
  kycStatus: string;
  stripeIdentitySessionId: string | null;
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const row = await db()
    .prepare("SELECT kycStatus, stripeIdentitySessionId FROM user WHERE id = ?")
    .bind(session.user.id)
    .first<UserKycRow>();

  if (row?.kycStatus === "verified") {
    return NextResponse.json({ error: "Already verified" }, { status: 400 });
  }

  const s = await stripe();

  // Reuse an existing pending session if it's still usable
  if (row?.stripeIdentitySessionId) {
    try {
      const existing = await s.identity.verificationSessions.retrieve(row.stripeIdentitySessionId);
      if (existing.status === "requires_input" && existing.url) {
        return NextResponse.json({ url: existing.url });
      }
    } catch {
      // fall through and create a new one
    }
  }

  const vs = await s.identity.verificationSessions.create({
    type: "document",
    metadata: { userId: session.user.id },
    options: {
      document: {
        require_matching_selfie: true,
        require_live_capture: true,
      },
    },
  });

  const nowSec = Math.floor(Date.now() / 1000);
  await db()
    .prepare(
      "UPDATE user SET kycStatus = 'pending', stripeIdentitySessionId = ?, updatedAt = ? WHERE id = ?"
    )
    .bind(vs.id, nowSec, session.user.id)
    .run();

  return NextResponse.json({ url: vs.url });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const row = await db()
    .prepare("SELECT kycStatus, kycVerifiedAt, dateOfBirth FROM user WHERE id = ?")
    .bind(session.user.id)
    .first<{ kycStatus: string; kycVerifiedAt: number | null; dateOfBirth: number | null }>();

  return NextResponse.json(row ?? { kycStatus: "unverified", kycVerifiedAt: null, dateOfBirth: null });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import type { HostProfile } from "@/lib/types";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function appUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";
}

export async function POST(_req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const hp = await db()
    .prepare("SELECT * FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<HostProfile & { stripeOnboardingCompleted: number }>();

  if (!hp) return bad("Host profile not found", 404);

  let s;
  try {
    s = await stripe();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("stripe() init failed:", msg);
    return bad(`Stripe init failed: ${msg}`, 500);
  }

  let accountId = hp.stripeAccountId;

  if (!accountId) {
    try {
      const account = await s.accounts.create({
        type: "express",
        country: "NZ",
        email: session.user.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { userId: session.user.id },
      });
      accountId = account.id;
      const nowSec = Math.floor(Date.now() / 1000);
      await db()
        .prepare("UPDATE host_profile SET stripeAccountId = ?, updatedAt = ? WHERE userId = ?")
        .bind(accountId, nowSec, session.user.id)
        .run();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Stripe accounts.create failed:", msg);
      return bad(`Stripe account creation failed: ${msg}`, 500);
    }
  }

  try {
    const accountLink = await s.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl()}/dashboard/payouts/onboard`,
      return_url:  `${appUrl()}/dashboard/payouts`,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: accountLink.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Stripe accountLinks.create failed:", msg);
    return bad(`Stripe link creation failed: ${msg}`, 500);
  }
}

export async function GET(_req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const hp = await db()
    .prepare("SELECT stripeAccountId, stripeOnboardingCompleted FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<{ stripeAccountId: string | null; stripeOnboardingCompleted: number }>();

  if (!hp?.stripeAccountId) return NextResponse.json({ status: "none" });

  if (hp.stripeOnboardingCompleted) return NextResponse.json({ status: "completed" });

  // Re-check with Stripe in case webhook was missed
  const s = await stripe();
  const account = await s.accounts.retrieve(hp.stripeAccountId);
  if (account.charges_enabled) {
    const nowSec = Math.floor(Date.now() / 1000);
    await db()
      .prepare("UPDATE host_profile SET stripeOnboardingCompleted = 1, updatedAt = ? WHERE userId = ?")
      .bind(nowSec, session.user.id)
      .run();
    return NextResponse.json({ status: "completed" });
  }

  return NextResponse.json({ status: "pending" });
}

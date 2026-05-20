import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(_req: Request) {
  const session = await getSession();
  if (!session) return bad("Sign in required", 401);

  const hp = await db()
    .prepare("SELECT stripeAccountId FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<{ stripeAccountId: string | null }>();

  if (!hp?.stripeAccountId) return bad("Stripe account not set up", 404);

  const s = await stripe();
  const link = await s.accounts.createLoginLink(hp.stripeAccountId);

  return NextResponse.json({ url: link.url });
}

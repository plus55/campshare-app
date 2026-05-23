import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import type Stripe from "stripe";

type CfEnv = { STRIPE_WEBHOOK_SECRET?: string };

async function webhookSecret(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  const cfEnv = env as unknown as CfEnv;
  const secret = cfEnv.STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return secret;
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const s = await stripe();
    const secret = await webhookSecret();
    event = await s.webhooks.constructEventAsync(body, sig, secret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const nowSec = Math.floor(Date.now() / 1000);

  // Idempotency: insert event — UNIQUE on stripeEventId prevents double-processing
  const eventId = crypto.randomUUID();
  const bookingId = extractBookingId(event);
  try {
    await db()
      .prepare(
        `INSERT INTO payment_event (id, stripeEventId, eventType, bookingId, payload, status, createdAt)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`
      )
      .bind(eventId, event.id, event.type, bookingId ?? null, JSON.stringify(event.data), nowSec)
      .run();
  } catch {
    const existing = await db()
      .prepare("SELECT status, createdAt FROM payment_event WHERE stripeEventId = ?")
      .bind(event.id)
      .first<{ status: string; createdAt: number }>();
    if (existing?.status === "processed") {
      return NextResponse.json({ received: true });
    }
    if (existing?.status === "pending") {
      if (existing.createdAt > nowSec - 300) {
        return NextResponse.json({ error: "Event is already processing" }, { status: 409 });
      }
      const reclaimed = await db()
        .prepare("UPDATE payment_event SET createdAt = ? WHERE stripeEventId = ? AND status = 'pending' AND createdAt = ?")
        .bind(nowSec, event.id, existing.createdAt)
        .run();
      if (reclaimed.meta.changes === 0) {
        return NextResponse.json({ error: "Event retry is already processing" }, { status: 409 });
      }
    }
    if (!existing || !["pending", "failed"].includes(existing.status)) {
      return NextResponse.json({ error: "Could not register event" }, { status: 500 });
    }
    if (existing.status === "failed") {
      const claimed = await db()
        .prepare("UPDATE payment_event SET status = 'pending', createdAt = ? WHERE stripeEventId = ? AND status = 'failed'")
        .bind(nowSec, event.id)
        .run();
      if (claimed.meta.changes === 0) {
        return NextResponse.json({ error: "Event retry is already processing" }, { status: 409 });
      }
    }
  }

  try {
    await handleEvent(event, nowSec);
    await db()
      .prepare("UPDATE payment_event SET status = 'processed', processedAt = ? WHERE stripeEventId = ?")
      .bind(nowSec, event.id)
      .run();
  } catch (err) {
    console.error(`Failed to process Stripe event ${event.type}`, err);
    await db()
      .prepare("UPDATE payment_event SET status = 'failed' WHERE stripeEventId = ?")
      .bind(event.id)
      .run();
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function extractBookingId(event: Stripe.Event): string | null {
  const obj = event.data.object as unknown as { metadata?: Record<string, string> };
  return obj.metadata?.bookingId ?? null;
}

async function handleEvent(event: Stripe.Event, nowSec: number): Promise<void> {
  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const enabled = account.charges_enabled && account.payouts_enabled ? 1 : 0;
      await db()
        .prepare(
          `UPDATE host_profile SET stripeOnboardingCompleted = ?, updatedAt = ?
           WHERE stripeAccountId = ?`
        )
        .bind(enabled, nowSec, account.id)
        .run();
      break;
    }

    case "transfer.created": {
      const transfer = event.data.object as Stripe.Transfer;
      const meta = transfer.metadata as Record<string, string> | undefined;
      const bId = meta?.bookingId;
      if (bId) {
        await db()
          .prepare(
            `UPDATE payout SET stripeTransferId = ?, status = 'paid', updatedAt = ?
             WHERE bookingId = ? AND status = 'pending'`
          )
          .bind(transfer.id, nowSec, bId)
          .run();
      }
      break;
    }

    case "identity.verification_session.verified": {
      const vs = event.data.object as Stripe.Identity.VerificationSession;
      const userId = vs.metadata?.userId;
      if (!userId) break;
      // Re-fetch with expanded outputs to get DOB
      let dobUnix: number | null = null;
      try {
        const s = await stripe();
        const expanded = await s.identity.verificationSessions.retrieve(vs.id, {
          expand: ["verified_outputs"],
        });
        const dob = expanded.verified_outputs?.dob;
        if (dob?.year && dob.month && dob.day) {
          dobUnix = Math.floor(Date.UTC(dob.year, dob.month - 1, dob.day) / 1000);
        }
      } catch (err) {
        console.error("Failed to expand verified_outputs", err);
      }
      await db()
        .prepare(
          "UPDATE user SET kycStatus = 'verified', kycVerifiedAt = ?, dateOfBirth = COALESCE(?, dateOfBirth), updatedAt = ? WHERE id = ?"
        )
        .bind(nowSec, dobUnix, nowSec, userId)
        .run();
      break;
    }

    case "identity.verification_session.requires_input": {
      const vs = event.data.object as Stripe.Identity.VerificationSession;
      const userId = vs.metadata?.userId;
      if (!userId) break;
      await db()
        .prepare("UPDATE user SET kycStatus = 'failed', updatedAt = ? WHERE id = ?")
        .bind(nowSec, userId)
        .run();
      break;
    }

    case "identity.verification_session.canceled": {
      const vs = event.data.object as Stripe.Identity.VerificationSession;
      const userId = vs.metadata?.userId;
      if (!userId) break;
      await db()
        .prepare(
          "UPDATE user SET kycStatus = 'unverified', stripeIdentitySessionId = NULL, updatedAt = ? WHERE id = ?"
        )
        .bind(nowSec, userId)
        .run();
      break;
    }

    default:
      break;
  }
}

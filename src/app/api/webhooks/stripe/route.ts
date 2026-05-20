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
    // UNIQUE constraint violation — already processed
    return NextResponse.json({ received: true });
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
      if (account.charges_enabled) {
        await db()
          .prepare(
            `UPDATE host_profile SET stripeOnboardingCompleted = 1, updatedAt = ?
             WHERE stripeAccountId = ?`
          )
          .bind(nowSec, account.id)
          .run();
      }
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

    default:
      break;
  }
}

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendDepositHoldEmail, sendDepositReleasedEmail, sendPayoutSentEmail, sendReviewPromptEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import type { Booking } from "@/lib/types";

type CfEnv = { CRON_SECRET?: string };

// Called by a Cloudflare Cron Trigger or via HTTP with a secret header.
export async function GET(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const cfEnv = env as unknown as CfEnv;
  const secret = cfEnv.CRON_SECRET ?? process.env.CRON_SECRET;

  if (secret) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const nowMs  = Date.now();
  const nowSec = Math.floor(nowMs / 1000);

  // Pass 1: accepted → in_progress when trip has started
  const toStart = await db()
    .prepare(
      `SELECT * FROM booking WHERE status = 'accepted' AND startDate <= ?`
    )
    .bind(nowMs)
    .all<Booking>();

  for (const booking of toStart.results) {
    await startTrip(booking, nowSec, nowMs);
  }

  // Pass 2: in_progress → completed when trip ended + 24h holdback
  const holdbackMs = 24 * 60 * 60 * 1000;
  const toComplete = await db()
    .prepare(
      `SELECT * FROM booking WHERE status = 'in_progress' AND endDate + ? <= ?`
    )
    .bind(holdbackMs, nowMs)
    .all<Booking>();

  for (const booking of toComplete.results) {
    await completeTrip(booking, nowSec);
  }

  return NextResponse.json({
    started: toStart.results.length,
    completed: toComplete.results.length,
  });
}

async function startTrip(booking: Booking, nowSec: number, nowMs: number): Promise<void> {
  await db()
    .prepare("UPDATE booking SET status = 'in_progress', startedAt = ?, updatedAt = ? WHERE id = ?")
    .bind(nowSec, nowSec, booking.id)
    .run();

  // Create deposit hold PI (manual capture, off_session)
  if (booking.customerStripeId && booking.depositPaymentMethodId) {
    const s = await stripe();
    try {
      const depositPi = await s.paymentIntents.create({
        amount: booking.depositCents,
        currency: "nzd",
        customer: booking.customerStripeId,
        payment_method: booking.depositPaymentMethodId,
        capture_method: "manual",
        off_session: true,
        confirm: true,
        metadata: { bookingId: booking.id, type: "deposit" },
      });

      await db()
        .prepare("UPDATE booking SET depositPaymentIntentId = ?, updatedAt = ? WHERE id = ?")
        .bind(depositPi.id, nowSec, booking.id)
        .run();

      // Email guest about deposit hold
      const guest = await db()
        .prepare("SELECT email, name FROM user WHERE id = ?")
        .bind(booking.guestUserId)
        .first<{ email: string; name: string }>();
      const listing = await db()
        .prepare("SELECT name FROM van_listing WHERE id = ?")
        .bind(booking.vanListingId)
        .first<{ name: string }>();

      if (guest) {
        await sendDepositHoldEmail({
          guestEmail: guest.email,
          guestName: guest.name,
          vanName: listing?.name ?? "",
          bookingId: booking.id,
          depositCents: booking.depositCents,
          endDate: booking.endDate,
        }).catch((e) => console.error("Failed to send deposit hold email", e));
      }
    } catch (e) {
      console.error(`Failed to create deposit hold for booking ${booking.id}`, e);
    }
  }
}

async function completeTrip(booking: Booking, nowSec: number): Promise<void> {
  const s = await stripe();

  // Release deposit hold
  if (booking.depositPaymentIntentId) {
    try {
      await s.paymentIntents.cancel(booking.depositPaymentIntentId);
    } catch (e) {
      console.error(`Failed to cancel deposit PI for booking ${booking.id}`, e);
    }
  }

  // Create Connect transfer for host payout
  const payoutAmount = booking.hostPayoutCents;
  if (payoutAmount && payoutAmount > 0) {
    const hp = await db()
      .prepare("SELECT stripeAccountId FROM host_profile WHERE userId = ?")
      .bind(booking.hostUserId)
      .first<{ stripeAccountId: string | null }>();

    if (hp?.stripeAccountId) {
      const payoutId = crypto.randomUUID();
      await db()
        .prepare(
          `INSERT INTO payout (id, bookingId, hostUserId, amountCents, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 'pending', ?, ?)`
        )
        .bind(payoutId, booking.id, booking.hostUserId, payoutAmount, nowSec, nowSec)
        .run();

      try {
        const transfer = await s.transfers.create({
          amount: payoutAmount,
          currency: "nzd",
          destination: hp.stripeAccountId,
          metadata: { bookingId: booking.id, payoutId },
        });

        await db()
          .prepare("UPDATE payout SET stripeTransferId = ?, status = 'paid', updatedAt = ? WHERE id = ?")
          .bind(transfer.id, nowSec, payoutId)
          .run();

        const host = await db()
          .prepare("SELECT email, name FROM user WHERE id = ?")
          .bind(booking.hostUserId)
          .first<{ email: string; name: string }>();
        const listing = await db()
          .prepare("SELECT name FROM van_listing WHERE id = ?")
          .bind(booking.vanListingId)
          .first<{ name: string }>();

        if (host) {
          await sendPayoutSentEmail({
            hostEmail: host.email,
            hostName: host.name,
            vanName: listing?.name ?? "",
            bookingId: booking.id,
            amountCents: payoutAmount,
          }).catch((e) => console.error("Failed to send payout email", e));
          await createNotification({
            userId: booking.hostUserId,
            type: "payout_sent",
            payload: { bookingId: booking.id, vanName: listing?.name ?? "" },
          });
        }
      } catch (e) {
        console.error(`Failed to create Stripe transfer for booking ${booking.id}`, e);
        await db()
          .prepare("UPDATE payout SET status = 'failed', updatedAt = ? WHERE id = ?")
          .bind(nowSec, payoutId)
          .run();
      }
    }
  }

  // Email guest about deposit release
  const guest = await db()
    .prepare("SELECT email, name FROM user WHERE id = ?")
    .bind(booking.guestUserId)
    .first<{ email: string; name: string }>();
  const listing = await db()
    .prepare("SELECT name FROM van_listing WHERE id = ?")
    .bind(booking.vanListingId)
    .first<{ name: string }>();

  if (guest) {
    await sendDepositReleasedEmail({
      guestEmail: guest.email,
      guestName: guest.name,
      vanName: listing?.name ?? "",
      bookingId: booking.id,
    }).catch((e) => console.error("Failed to send deposit released email", e));
    await createNotification({
      userId: booking.guestUserId,
      type: "deposit_released",
      payload: { bookingId: booking.id, vanName: listing?.name ?? "" },
    });
  }

  // Review prompts: fire once per booking, both parties simultaneously.
  if (!booking.reviewPromptSentAt) {
    const host = await db()
      .prepare("SELECT email, name FROM user WHERE id = ?")
      .bind(booking.hostUserId)
      .first<{ email: string; name: string }>();

    if (guest) {
      await sendReviewPromptEmail({
        to: guest.email,
        recipientName: guest.name,
        role: "guest",
        bookingId: booking.id,
        vanName: listing?.name ?? "",
      }).catch((e) => console.error("Failed to send guest review prompt", e));
      await createNotification({
        userId: booking.guestUserId,
        type: "review_prompt",
        payload: { bookingId: booking.id, vanName: listing?.name ?? "" },
      });
    }
    if (host) {
      await sendReviewPromptEmail({
        to: host.email,
        recipientName: host.name,
        role: "host",
        bookingId: booking.id,
        vanName: listing?.name ?? "",
      }).catch((e) => console.error("Failed to send host review prompt", e));
      await createNotification({
        userId: booking.hostUserId,
        type: "review_prompt",
        payload: { bookingId: booking.id, vanName: listing?.name ?? "" },
      });
    }
  }

  await db()
    .prepare(
      "UPDATE booking SET status = 'completed', completedAt = ?, reviewPromptSentAt = COALESCE(reviewPromptSentAt, ?), updatedAt = ? WHERE id = ?"
    )
    .bind(nowSec, nowSec, nowSec, booking.id)
    .run();
}

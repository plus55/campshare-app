import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendBrandedEmail, sendDepositHoldEmail, sendDepositReleasedEmail, sendPayoutSentEmail, sendReviewPromptEmail, sendSavedSearchAlertEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { syncIcalFeed } from "@/lib/ical";
import { expireBookingRequest } from "@/lib/booking-expiry";
import type { Booking } from "@/lib/types";

type CfEnv = { CRON_SECRET?: string };

// Called by a Cloudflare Cron Trigger or via HTTP with a secret header.
export async function GET(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const cfEnv = env as unknown as CfEnv;
  const secret = cfEnv.CRON_SECRET ?? process.env.CRON_SECRET;

  if (!secret) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }

  const provided = req.headers.get("x-cron-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowMs  = Date.now();
  const nowSec = Math.floor(nowMs / 1000);

  const toExpire = await db()
    .prepare("SELECT * FROM booking WHERE status = 'requested' AND expiresAt < ?")
    .bind(nowSec)
    .all<Booking>();
  let expired = 0;
  for (const booking of toExpire.results) {
    if (await expireBookingRequest(booking, nowSec)) expired++;
  }

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

  // Pass 3: saved search alerts — check each saved_search against listings published since lastAlertedAt
  const alertsSent = await runSavedSearchAlerts(nowSec);

  // Pass 4: iCal feed sync — refresh all imported calendars
  const icalSynced = await runIcalSync();

  // Pass 5: insurance expiry — mark lapsed policies and pause affected listings
  const insuranceExpired = await expireLapsedInsurance(nowSec);

  return NextResponse.json({
    expired,
    started: toStart.results.length,
    completed: toComplete.results.length,
    alertsSent,
    icalSynced,
    insuranceExpired,
  });
}

interface ExpiringHostRow {
  userId: string;
  firstName: string;
  email: string;
}

// Hosts whose hire insurance has lapsed: flag as expired, pause their live
// listings so no uninsured van is bookable, and prompt them to renew.
async function expireLapsedInsurance(nowSec: number): Promise<number> {
  const lapsed = await db()
    .prepare(
      `SELECT hp.userId, hp.firstName, u.email
       FROM host_profile hp JOIN user u ON u.id = hp.userId
       WHERE hp.insuranceStatus = 'verified'
         AND hp.insuranceExpiryDate IS NOT NULL
         AND hp.insuranceExpiryDate <= ?`,
    )
    .bind(nowSec)
    .all<ExpiringHostRow>();

  const appUrl = process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";

  for (const host of lapsed.results) {
    await db().batch([
      db()
        .prepare("UPDATE host_profile SET insuranceStatus = 'expired', updatedAt = ? WHERE userId = ?")
        .bind(nowSec, host.userId),
      db()
        .prepare("UPDATE van_listing SET status = 'paused', updatedAt = ? WHERE hostUserId = ? AND status = 'published'")
        .bind(nowSec, host.userId),
    ]);

    await sendBrandedEmail({
      to: host.email,
      subject: "Your CampShare hire insurance has expired",
      heading: "Renew your hire insurance",
      intro: `Kia ora ${host.firstName}, your hire insurance has lapsed, so your listings have been paused. Upload a current policy to get them live again.`,
      cta: { label: "Update insurance", href: `${appUrl}/dashboard/profile` },
    }).catch((e) => console.error("Failed to send insurance expiry email", e));
  }

  return lapsed.results.length;
}

interface SavedSearchRow {
  id: string;
  userId: string;
  filters: string;
  lastAlertedAt: number | null;
  createdAt: number;
  email: string;
  name: string;
}

interface MatchingListing {
  id: string;
  slug: string;
  name: string;
  region: string;
  nightlyRate: number;
}

async function runSavedSearchAlerts(nowSec: number): Promise<number> {
  const { results: searches } = await db()
    .prepare(
      `SELECT ss.id, ss.userId, ss.filters, ss.lastAlertedAt, ss.createdAt,
              u.email, u.name
       FROM saved_search ss
       JOIN user u ON u.id = ss.userId`
    )
    .all<SavedSearchRow>();

  let sent = 0;
  const appBase = process.env.BETTER_AUTH_URL ?? "https://app.campshare.co.nz";

  for (const s of searches) {
    let filters: Record<string, string>;
    try {
      filters = JSON.parse(s.filters);
    } catch {
      continue;
    }

    const since = s.lastAlertedAt ?? s.createdAt;
    const where: string[] = ["vl.status = 'published'", "vl.publishedAt IS NOT NULL", "vl.publishedAt > ?"];
    const binds: unknown[] = [since];

    if (filters.region) { where.push("vl.region = ?"); binds.push(filters.region); }
    if (filters.vanType) { where.push("vl.vanType = ?"); binds.push(filters.vanType); }
    if (filters.sleeps) { where.push("vl.sleeps >= ?"); binds.push(parseInt(filters.sleeps, 10)); }
    if (filters.minRate) { where.push("vl.nightlyRate >= ?"); binds.push(Math.round(parseFloat(filters.minRate) * 100)); }
    if (filters.maxRate) { where.push("vl.nightlyRate <= ?"); binds.push(Math.round(parseFloat(filters.maxRate) * 100)); }
    if (filters.petFriendly === "1") { where.push("vl.petFriendly = 1"); }
    if (filters.instantBook === "1") { where.push("vl.instantBook = 1"); }

    const { results: matches } = await db()
      .prepare(
        `SELECT vl.id, vl.slug, vl.name, vl.region, vl.nightlyRate
         FROM van_listing vl
         WHERE ${where.join(" AND ")}
         ORDER BY vl.publishedAt DESC
         LIMIT 20`
      )
      .bind(...binds)
      .all<MatchingListing>();

    if (matches.length === 0) {
      await db()
        .prepare("UPDATE saved_search SET lastAlertedAt = ? WHERE id = ?")
        .bind(nowSec, s.id)
        .run();
      continue;
    }

    const searchQuery = new URLSearchParams(filters).toString();
    const description = describeFiltersForEmail(filters);
    try {
      await sendSavedSearchAlertEmail({
        to: s.email,
        recipientName: s.name,
        searchDescription: description,
        matches,
        searchUrl: `${appBase}/vans?${searchQuery}`,
      });
      sent++;
    } catch (e) {
      console.error(`Failed to send saved-search alert for ${s.id}`, e);
    }

    await db()
      .prepare("UPDATE saved_search SET lastAlertedAt = ? WHERE id = ?")
      .bind(nowSec, s.id)
      .run();
  }

  return sent;
}

function describeFiltersForEmail(f: Record<string, string>): string {
  const parts: string[] = [];
  if (f.region) parts.push(f.region);
  if (f.vanType) parts.push(f.vanType);
  if (f.sleeps) parts.push(`sleeps ${f.sleeps}+`);
  if (f.petFriendly === "1") parts.push("pet-friendly");
  if (f.instantBook === "1") parts.push("instant book");
  return parts.length === 0 ? "your saved search" : parts.join(", ");
}

async function runIcalSync(): Promise<number> {
  const { results: listings } = await db()
    .prepare(
      "SELECT id, icalFeedUrl FROM van_listing WHERE icalFeedUrl IS NOT NULL"
    )
    .all<{ id: string; icalFeedUrl: string }>();

  let synced = 0;
  for (const listing of listings) {
    try {
      await syncIcalFeed(listing.id, listing.icalFeedUrl);
      synced++;
    } catch (e) {
      console.error(`iCal sync failed for listing ${listing.id}:`, e);
    }
  }
  return synced;
}

async function startTrip(booking: Booking, nowSec: number, nowMs: number): Promise<void> {
  try {
    await db()
      .prepare("INSERT INTO booking_transition_lock (bookingId, operation, createdAt) VALUES (?, 'start-trip', ?)")
      .bind(booking.id, nowSec)
      .run();
  } catch {
    return;
  }

  const started = await db()
    .prepare("UPDATE booking SET status = 'in_progress', startedAt = ?, updatedAt = ? WHERE id = ? AND status = 'accepted'")
    .bind(nowSec, nowSec, booking.id)
    .run();
  if (started.meta.changes === 0) {
    await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(booking.id).run();
    return;
  }

  // Create deposit hold PI (manual capture, off_session)
  if (booking.customerStripeId && booking.depositPaymentMethodId) {
    const s = await stripe();
    try {
      const depositPi = await s.paymentIntents.create(
        {
          amount: booking.depositCents,
          currency: "nzd",
          customer: booking.customerStripeId,
          payment_method: booking.depositPaymentMethodId,
          capture_method: "manual",
          off_session: true,
          confirm: true,
          metadata: { bookingId: booking.id, type: "deposit" },
        },
        { idempotencyKey: `booking-deposit-${booking.id}` }
      );

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

  await db().prepare("DELETE FROM booking_transition_lock WHERE bookingId = ?").bind(booking.id).run();
}

async function completeTrip(booking: Booking, nowSec: number): Promise<void> {
  const s = await stripe();

  // Release deposit hold
  if (booking.depositPaymentIntentId) {
    try {
      await s.paymentIntents.cancel(
        booking.depositPaymentIntentId,
        {},
        { idempotencyKey: `booking-deposit-release-${booking.id}` }
      );
    } catch (e) {
      console.error(`Failed to cancel deposit PI for booking ${booking.id}`, e);
      return;
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
      const payoutId = `booking-payout-${booking.id}`;
      await db()
        .prepare(
          `INSERT OR IGNORE INTO payout (id, bookingId, hostUserId, amountCents, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 'pending', ?, ?)`
        )
        .bind(payoutId, booking.id, booking.hostUserId, payoutAmount, nowSec, nowSec)
        .run();

      const payout = await db()
        .prepare("SELECT id, status FROM payout WHERE bookingId = ?")
        .bind(booking.id)
        .first<{ id: string; status: string }>();

      if (payout && payout.status !== "paid") {
        try {
          const transfer = await s.transfers.create(
            {
              amount: payoutAmount,
              currency: "nzd",
              destination: hp.stripeAccountId,
              metadata: { bookingId: booking.id, payoutId: payout.id },
            },
            { idempotencyKey: `booking-payout-${booking.id}` }
          );

          await db()
            .prepare("UPDATE payout SET stripeTransferId = ?, status = 'paid', updatedAt = ? WHERE id = ?")
            .bind(transfer.id, nowSec, payout.id)
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
            .bind(nowSec, payout.id)
            .run();
          return;
        }
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
        payload: { bookingId: booking.id, vanName: listing?.name ?? "", recipientRole: "guest" },
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
        payload: { bookingId: booking.id, vanName: listing?.name ?? "", recipientRole: "host" },
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

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendBrandedEmail } from "@/lib/email";
import { fmtNzd } from "@/lib/money";
import { damageClaimToHostCents } from "@/lib/deposit-claim";
import type { DepositClaim } from "@/lib/types";

const schema = z.object({
  status: z.enum(["under_review", "resolved_host", "resolved_guest", "resolved_split", "dismissed"]),
  adminNote: z.string().max(4000).optional().nullable(),
  depositAction: z.enum(["released_to_host", "returned_to_guest", "split"]).optional().nullable(),
  depositSplitToHostCents: z.number().int().min(0).optional().nullable(),
});

type ClaimResult =
  | { status: "skipped" }
  | { status: "already_done"; amountCents: number }
  | { status: "transferred"; amountCents: number }
  | { status: "failed"; amountCents: number; reason: string };

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const { status, adminNote, depositAction, depositSplitToHostCents } = parsed.data;

  const existing = await db()
    .prepare("SELECT id, bookingId, status FROM dispute WHERE id = ?")
    .bind(id)
    .first<{ id: string; bookingId: string; status: string }>();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isResolution = ["resolved_host", "resolved_guest", "resolved_split", "dismissed"].includes(status);
  const now = Math.floor(Date.now() / 1000);

  await db()
    .prepare(
      `UPDATE dispute
       SET status = ?, adminNote = ?, depositAction = ?, depositSplitToHostCents = ?, resolvedAt = ?
       WHERE id = ?`
    )
    .bind(
      status,
      adminNote ?? null,
      depositAction ?? null,
      depositSplitToHostCents ?? null,
      isResolution ? now : null,
      id
    )
    .run();

  await logAudit({
    actorUserId: session.user.id,
    action: `dispute_${status}`,
    targetType: "dispute",
    targetId: id,
    metadata: { depositAction: depositAction ?? null, depositSplitToHostCents: depositSplitToHostCents ?? null, adminNote: adminNote ?? null },
  });

  // Execute the deposit claim (charge guest's saved card, transfer to host)
  // for resolutions that award deposit money to the host.
  let claim: ClaimResult = { status: "skipped" };
  if (depositAction === "released_to_host" || depositAction === "split") {
    claim = await executeDepositClaim(id, existing.bookingId, depositAction, depositSplitToHostCents ?? null, session.user.id);
  }

  return NextResponse.json({ ok: true, claim });
}

async function executeDepositClaim(
  disputeId: string,
  bookingId: string,
  action: "released_to_host" | "split",
  splitToHostCents: number | null,
  adminUserId: string,
): Promise<ClaimResult> {
  const booking = await db()
    .prepare(
      `SELECT b.depositCents, b.depositPaymentMethodId, b.customerStripeId,
              b.hostUserId, b.guestUserId, b.vanListingId,
              hp.stripeAccountId
       FROM booking b JOIN host_profile hp ON hp.userId = b.hostUserId
       WHERE b.id = ?`
    )
    .bind(bookingId)
    .first<{
      depositCents: number;
      depositPaymentMethodId: string | null;
      customerStripeId: string | null;
      hostUserId: string;
      guestUserId: string;
      vanListingId: string;
      stripeAccountId: string | null;
    }>();
  if (!booking) return { status: "failed", amountCents: 0, reason: "Booking not found" };

  const amountCents = damageClaimToHostCents(action, booking.depositCents, splitToHostCents);
  if (amountCents <= 0) return { status: "skipped" };

  // Idempotency: one claim per dispute.
  const prior = await db()
    .prepare("SELECT * FROM deposit_claim WHERE id = ?")
    .bind(disputeId)
    .first<DepositClaim>();
  if (prior?.status === "transferred") return { status: "already_done", amountCents: prior.amountCents };

  if (!booking.depositPaymentMethodId || !booking.customerStripeId) {
    return { status: "failed", amountCents, reason: "No saved payment method on file — recover the deposit manually in Stripe." };
  }
  if (!booking.stripeAccountId) {
    return { status: "failed", amountCents, reason: "Host has no connected payout account — pay the host manually in Stripe." };
  }

  const now = Math.floor(Date.now() / 1000);
  if (!prior) {
    await db()
      .prepare(
        `INSERT INTO deposit_claim (id, disputeId, bookingId, hostUserId, amountCents, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
      )
      .bind(disputeId, disputeId, bookingId, booking.hostUserId, amountCents, now, now)
      .run();
  }

  const s = await stripe();

  // 1. Charge the guest's saved card off-session, capped at the deposit.
  let chargePaymentIntentId = prior?.chargePaymentIntentId ?? null;
  if (!chargePaymentIntentId) {
    try {
      const pi = await s.paymentIntents.create(
        {
          amount: amountCents,
          currency: "nzd",
          customer: booking.customerStripeId,
          payment_method: booking.depositPaymentMethodId,
          off_session: true,
          confirm: true,
          metadata: { disputeId, bookingId, type: "damage_claim" },
        },
        { idempotencyKey: `dispute-claim-charge-${disputeId}` }
      );
      if (pi.status !== "succeeded") {
        await db().prepare("UPDATE deposit_claim SET status = 'failed', updatedAt = ? WHERE id = ?").bind(now, disputeId).run();
        return { status: "failed", amountCents, reason: `Card charge did not succeed (${pi.status}).` };
      }
      chargePaymentIntentId = pi.id;
      await db()
        .prepare("UPDATE deposit_claim SET chargePaymentIntentId = ?, status = 'charged', updatedAt = ? WHERE id = ?")
        .bind(chargePaymentIntentId, now, disputeId)
        .run();
    } catch (e) {
      await db().prepare("UPDATE deposit_claim SET status = 'failed', updatedAt = ? WHERE id = ?").bind(now, disputeId).run();
      const msg = e instanceof Error ? e.message : "charge failed";
      return { status: "failed", amountCents, reason: `Could not charge the guest's card: ${msg}` };
    }
  }

  // 2. Transfer the recovered amount to the host's connected account.
  try {
    const transfer = await s.transfers.create(
      {
        amount: amountCents,
        currency: "nzd",
        destination: booking.stripeAccountId,
        metadata: { disputeId, bookingId, type: "damage_claim" },
      },
      { idempotencyKey: `dispute-claim-transfer-${disputeId}` }
    );
    await db()
      .prepare("UPDATE deposit_claim SET stripeTransferId = ?, status = 'transferred', updatedAt = ? WHERE id = ?")
      .bind(transfer.id, now, disputeId)
      .run();
  } catch (e) {
    await db().prepare("UPDATE deposit_claim SET status = 'failed', updatedAt = ? WHERE id = ?").bind(now, disputeId).run();
    const msg = e instanceof Error ? e.message : "transfer failed";
    return { status: "failed", amountCents, reason: `Charged the guest but the host transfer failed: ${msg}. Resolve in Stripe.` };
  }

  await logAudit({
    actorUserId: adminUserId,
    action: "deposit_claim_executed",
    targetType: "deposit_claim",
    targetId: disputeId,
    metadata: { bookingId, amountCents },
  });

  const listing = await db()
    .prepare("SELECT name FROM van_listing WHERE id = ?")
    .bind(booking.vanListingId)
    .first<{ name: string }>();
  const vanName = listing?.name ?? "your booking";

  await Promise.all([
    createNotification({ userId: booking.hostUserId, type: "damage_claim_resolved", payload: { bookingId, amountCents, vanName, recipientRole: "host" } }),
    createNotification({ userId: booking.guestUserId, type: "damage_claim_resolved", payload: { bookingId, amountCents, vanName, recipientRole: "guest" } }),
  ]);

  const [host, guest] = await Promise.all([
    db().prepare("SELECT email, name FROM user WHERE id = ?").bind(booking.hostUserId).first<{ email: string; name: string }>(),
    db().prepare("SELECT email, name FROM user WHERE id = ?").bind(booking.guestUserId).first<{ email: string; name: string }>(),
  ]);
  if (host) {
    await sendBrandedEmail({
      to: host.email,
      subject: "Damage claim resolved",
      heading: "Deposit claim paid out",
      intro: `${fmtNzd(amountCents)} from the security deposit for ${vanName} has been paid to you.`,
    }).catch((e) => console.error("Failed to send host claim email", e));
  }
  if (guest) {
    await sendBrandedEmail({
      to: guest.email,
      subject: "Security deposit claim",
      heading: "A claim was made on your deposit",
      intro: `${fmtNzd(amountCents)} of your security deposit for ${vanName} was charged following a resolved dispute.`,
    }).catch((e) => console.error("Failed to send guest claim email", e));
  }

  return { status: "transferred", amountCents };
}

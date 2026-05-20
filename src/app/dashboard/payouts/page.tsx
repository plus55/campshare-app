import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { StripeDashboardButton } from "@/components/StripeDashboardButton";
import type { Payout } from "@/lib/types";

interface PayoutRow extends Payout {
  vanName: string;
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-NZ", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Pacific/Auckland",
  });
}

export default async function PayoutsPage() {
  const session = await requireSession();

  let hp = await db()
    .prepare("SELECT stripeAccountId, stripeOnboardingCompleted FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<{ stripeAccountId: string | null; stripeOnboardingCompleted: number }>();

  // If account exists but webhook hasn't marked it complete, re-check with Stripe directly
  if (hp?.stripeAccountId && !hp.stripeOnboardingCompleted) {
    try {
      const s = await stripe();
      const account = await s.accounts.retrieve(hp.stripeAccountId);
      if (account.charges_enabled) {
        const nowSec = Math.floor(Date.now() / 1000);
        await db()
          .prepare("UPDATE host_profile SET stripeOnboardingCompleted = 1, updatedAt = ? WHERE userId = ?")
          .bind(nowSec, session.user.id)
          .run();
        hp = { ...hp, stripeOnboardingCompleted: 1 };
      }
    } catch { /* non-fatal — show onboard button as fallback */ }
  }

  const result = await db()
    .prepare(
      `SELECT p.*, vl.name AS vanName
       FROM payout p
       JOIN booking b ON b.id = p.bookingId
       JOIN van_listing vl ON vl.id = b.vanListingId
       WHERE p.hostUserId = ?
       ORDER BY p.createdAt DESC`
    )
    .bind(session.user.id)
    .all<PayoutRow>();

  const payouts = result.results;
  const totalPaidCents = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <main className="cs-page">
      <div className="cs-container">
        <span className="cs-brand">CampShare</span>
        <p style={{ marginBottom: 8 }}>
          <Link href="/dashboard" className="cs-muted cs-small">← Dashboard</Link>
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>Payouts</h1>
          {hp?.stripeAccountId && hp.stripeOnboardingCompleted ? (
            <StripeDashboardButton />
          ) : (
            <Link href="/dashboard/payouts/onboard" className="cs-btn cs-btn-primary">
              Set up payouts
            </Link>
          )}
        </div>

        {totalPaidCents > 0 && (
          <div className="cs-card" style={{ marginBottom: 24 }}>
            <p className="cs-label" style={{ margin: 0 }}>Total received</p>
            <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 28 }}>
              ${(totalPaidCents / 100).toFixed(0)} NZD
            </p>
          </div>
        )}

        {payouts.length === 0 ? (
          <div className="cs-card">
            <p className="cs-muted">No payouts yet. Payouts are issued 24 hours after each trip ends.</p>
          </div>
        ) : (
          <div className="cs-card">
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Van</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.vanName}</td>
                    <td style={{ fontWeight: 600 }}>${(p.amountCents / 100).toFixed(0)} NZD</td>
                    <td>
                      <span className={`cs-pill ${p.status === "paid" ? "cs-pill-published" : p.status === "failed" ? "cs-pill-archived" : "cs-pill-pending"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="cs-muted cs-small">{fmtDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}


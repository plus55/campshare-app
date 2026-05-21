import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { StripeDashboardButton } from "@/components/StripeDashboardButton";
import { PayoutRow, type PayoutRowData } from "./PayoutRow";

type Period = "month" | "3m" | "12m" | "all";

function fmtNzd(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function periodLabel(p: Period) {
  return p === "month" ? "This month" :
         p === "3m" ? "Last 3 months" :
         p === "12m" ? "Last 12 months" :
         "All time";
}

// Returns unix seconds cutoff for the period start. 0 = all time.
function periodCutoffSec(p: Period): number {
  if (p === "all") return 0;
  const now = new Date();
  if (p === "month") {
    return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (p === "3m") return nowSec - 90 * 86400;
  if (p === "12m") return nowSec - 365 * 86400;
  return 0;
}

interface PayoutQueryRow extends PayoutRowData {}

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await requireSession();
  const { period: rawPeriod } = await searchParams;
  const period: Period =
    rawPeriod === "3m" ? "3m" :
    rawPeriod === "12m" ? "12m" :
    rawPeriod === "all" ? "all" :
    "month";

  let hp = await db()
    .prepare("SELECT stripeAccountId, stripeOnboardingCompleted FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<{ stripeAccountId: string | null; stripeOnboardingCompleted: number }>();

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
    } catch { /* non-fatal */ }
  }

  const cutoff = periodCutoffSec(period);

  const result = await db()
    .prepare(
      `SELECT p.id, p.amountCents, p.status, p.createdAt, p.bookingId,
              vl.name AS vanName,
              b.subtotalCents, b.serviceFeeCents, b.gstOnFeeCents,
              COALESCE(b.addonTotalCents, 0) AS addonTotalCents,
              b.startDate, b.endDate, b.nights
       FROM payout p
       JOIN booking b ON b.id = p.bookingId
       JOIN van_listing vl ON vl.id = b.vanListingId
       WHERE p.hostUserId = ? AND p.createdAt >= ?
       ORDER BY p.createdAt DESC`
    )
    .bind(session.user.id, cutoff)
    .all<PayoutQueryRow>();

  const payouts = result.results;
  const paidPayouts = payouts.filter((p) => p.status === "paid");

  const totalPaidCents = paidPayouts.reduce((sum, p) => sum + p.amountCents, 0);
  const totalNightlyCents = paidPayouts.reduce((sum, p) => sum + (p.subtotalCents ?? 0), 0);
  const totalAddonCents = paidPayouts.reduce((sum, p) => sum + p.addonTotalCents, 0);
  const totalPlatformFeeCents = paidPayouts.reduce((sum, p) => sum + (p.serviceFeeCents ?? 0) + (p.gstOnFeeCents ?? 0), 0);

  const periods: Period[] = ["month", "3m", "12m", "all"];

  return (
    <main className="cs-page">
      <div className="cs-container">
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

        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {periods.map((p) => (
            <Link
              key={p}
              href={`/dashboard/payouts?period=${p}`}
              className={`cs-btn cs-small ${period === p ? "cs-btn-primary" : "cs-btn-ghost"}`}
            >
              {periodLabel(p)}
            </Link>
          ))}
        </div>

        {paidPayouts.length > 0 && (
          <div className="cs-card" style={{ marginBottom: 24 }}>
            <p style={{ margin: "0 0 16px", fontWeight: 600, fontSize: 18 }}>
              Earnings — {periodLabel(period)}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
              <div>
                <p className="cs-label cs-small" style={{ margin: 0 }}>Nightly hire</p>
                <p style={{ margin: "2px 0 0", fontWeight: 600, fontSize: 20 }}>{fmtNzd(totalNightlyCents)}</p>
              </div>
              {totalAddonCents > 0 && (
                <div>
                  <p className="cs-label cs-small" style={{ margin: 0 }}>Add-ons</p>
                  <p style={{ margin: "2px 0 0", fontWeight: 600, fontSize: 20 }}>{fmtNzd(totalAddonCents)}</p>
                </div>
              )}
              <div>
                <p className="cs-label cs-small" style={{ margin: 0 }}>Platform fees (guest)</p>
                <p style={{ margin: "2px 0 0", fontWeight: 600, fontSize: 20, color: "var(--stone)" }}>
                  −{fmtNzd(totalPlatformFeeCents)}
                </p>
                <p className="cs-muted cs-small" style={{ margin: 0 }}>incl. GST</p>
              </div>
              <div style={{ borderLeft: "2px solid var(--line)", paddingLeft: 16 }}>
                <p className="cs-label cs-small" style={{ margin: 0 }}>Your total payout</p>
                <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: 24 }}>{fmtNzd(totalPaidCents)}</p>
              </div>
            </div>
          </div>
        )}

        {payouts.length === 0 ? (
          <div className="cs-card">
            <p className="cs-muted">No payouts in this period. Payouts are issued 24 hours after each trip ends.</p>
          </div>
        ) : (
          <div className="cs-card">
            <p className="cs-muted cs-small" style={{ margin: "0 0 12px" }}>
              Click a row to see the per-booking breakdown.
            </p>
            <table className="cs-table">
              <thead>
                <tr>
                  <th>Van</th>
                  <th>Nightly hire</th>
                  <th>Add-ons</th>
                  <th>Platform fee</th>
                  <th>Your payout</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <PayoutRow key={p.id} payout={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { StripeDashboardButton } from "@/components/StripeDashboardButton";
import { PayoutRow, type PayoutRowData } from "./PayoutRow";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  const database = await getDb();

  let hp = await database
    .prepare("SELECT stripeAccountId, stripeOnboardingCompleted FROM host_profile WHERE userId = ?")
    .bind(session.user.id)
    .first<{ stripeAccountId: string | null; stripeOnboardingCompleted: number }>();

  if (hp?.stripeAccountId && !hp.stripeOnboardingCompleted) {
    try {
      const s = await stripe();
      const account = await s.accounts.retrieve(hp.stripeAccountId);
      if (account.charges_enabled && account.payouts_enabled) {
        const nowSec = Math.floor(Date.now() / 1000);
        await database
          .prepare("UPDATE host_profile SET stripeOnboardingCompleted = 1, updatedAt = ? WHERE userId = ?")
          .bind(nowSec, session.user.id)
          .run();
        hp = { ...hp, stripeOnboardingCompleted: 1 };
      }
    } catch { /* non-fatal */ }
  }

  const cutoff = periodCutoffSec(period);

  const result = await database
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
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-6 flex items-start justify-between">
          <h1 className="m-0 font-serif text-3xl text-forest-deep dark:text-cream">Payouts</h1>
          {hp?.stripeAccountId && hp.stripeOnboardingCompleted ? (
            <StripeDashboardButton />
          ) : (
            <Link href="/dashboard/payouts/onboard" className={cn(buttonVariants())}>
              Set up payouts
            </Link>
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {periods.map((p) => (
            <Link
              key={p}
              href={`/dashboard/payouts?period=${p}`}
              className={cn(buttonVariants({ variant: period === p ? "default" : "outline", size: "sm" }))}
            >
              {periodLabel(p)}
            </Link>
          ))}
        </div>

        {paidPayouts.length > 0 && (
          <div className="surface-card mb-6">
            <p className="mb-4 text-lg font-semibold text-foreground">Earnings — {periodLabel(period)}</p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
              <div>
                <p className="m-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">Nightly hire</p>
                <p className="mt-0.5 text-xl font-semibold text-foreground">{fmtNzd(totalNightlyCents)}</p>
              </div>
              {totalAddonCents > 0 && (
                <div>
                  <p className="m-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">Add-ons</p>
                  <p className="mt-0.5 text-xl font-semibold text-foreground">{fmtNzd(totalAddonCents)}</p>
                </div>
              )}
              <div>
                <p className="m-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">Platform fees (guest)</p>
                <p className="mt-0.5 text-xl font-semibold text-muted-foreground">−{fmtNzd(totalPlatformFeeCents)}</p>
                <p className="m-0 text-xs text-muted-foreground">incl. GST</p>
              </div>
              <div className="border-l-2 border-border pl-4">
                <p className="m-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">Your total payout</p>
                <p className="mt-0.5 text-2xl font-bold text-foreground">{fmtNzd(totalPaidCents)}</p>
              </div>
            </div>
          </div>
        )}

        {payouts.length === 0 ? (
          <div className="surface-card">
            <p className="text-muted-foreground">No payouts in this period. Payouts are issued 24 hours after each trip ends.</p>
          </div>
        ) : (
          <div className="surface-card">
            <p className="mb-3 text-xs text-muted-foreground">Click a row to see the per-booking breakdown.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {["Van", "Nightly hire", "Add-ons", "Platform fee", "Your payout", "Status", "Date"].map((h) => (
                      <th key={h} scope="col" className="border-b border-border pb-2 text-left text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <PayoutRow key={p.id} payout={p} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

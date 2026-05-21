export const COMMISSION_GUEST_PCT = 12;
export const COMMISSION_HOST_PCT = 5;
export const GST_PCT = 15;
export const DEFAULT_DEPOSIT_CENTS = 50_000; // $500 NZD

export interface BookingTotals {
  subtotalCents: number;
  serviceFeeCents: number;
  gstOnFeeCents: number;
  totalCents: number;
  hostPayoutCents: number;
  depositCents: number;
}

// Add-ons are fee-free: hosts keep 100% of add-on revenue, no platform commission.
export function calcBookingTotals(
  nightlyRateCents: number,
  nights: number,
  addonTotalCents = 0,
): BookingTotals {
  const subtotalCents = nightlyRateCents * nights;
  const serviceFeeCents = Math.round(subtotalCents * COMMISSION_GUEST_PCT / 100);
  const gstOnFeeCents = Math.round(serviceFeeCents * GST_PCT / 100);
  const totalCents = subtotalCents + serviceFeeCents + gstOnFeeCents + addonTotalCents;
  const hostPayoutCents = Math.round(subtotalCents * (1 - COMMISSION_HOST_PCT / 100)) + addonTotalCents;
  return {
    subtotalCents,
    serviceFeeCents,
    gstOnFeeCents,
    totalCents,
    hostPayoutCents,
    depositCents: DEFAULT_DEPOSIT_CENTS,
  };
}

export function fmtNzd(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

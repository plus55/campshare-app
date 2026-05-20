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

export function calcBookingTotals(nightlyRateCents: number, nights: number): BookingTotals {
  const subtotalCents = nightlyRateCents * nights;
  const serviceFeeCents = Math.round(subtotalCents * COMMISSION_GUEST_PCT / 100);
  const gstOnFeeCents = Math.round(serviceFeeCents * GST_PCT / 100);
  const totalCents = subtotalCents + serviceFeeCents + gstOnFeeCents;
  const hostPayoutCents = Math.round(subtotalCents * (1 - COMMISSION_HOST_PCT / 100));
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

export function refundPercent(nowMs: number, startDateMs: number): 100 | 50 | 0 {
  const daysUntilStart = (startDateMs - nowMs) / 86_400_000;
  if (daysUntilStart > 7) return 100;
  if (daysUntilStart > 2) return 50;
  return 0;
}

export function computeRefundCents(
  totalCents: number,
  nowMs: number,
  startDateMs: number,
): { refundCents: number; retainedCents: number } {
  const pct = refundPercent(nowMs, startDateMs);
  const refundCents = Math.floor(totalCents * pct / 100);
  return { refundCents, retainedCents: totalCents - refundCents };
}

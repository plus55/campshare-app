export type DepositAction = "released_to_host" | "returned_to_guest" | "split";

/**
 * How much of the security deposit is recovered from the guest and paid to the
 * host for a resolved damage dispute. Capped at the deposit; never negative.
 *
 * - released_to_host: full deposit to host
 * - split:            the admin-specified amount to host (clamped to deposit)
 * - returned_to_guest: nothing charged
 */
export function damageClaimToHostCents(
  action: DepositAction,
  depositCents: number,
  splitToHostCents: number | null | undefined,
): number {
  if (action === "returned_to_guest") return 0;
  if (action === "released_to_host") return Math.max(0, depositCents);
  // split
  const requested = splitToHostCents ?? 0;
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  return Math.min(Math.max(0, Math.round(requested)), Math.max(0, depositCents));
}

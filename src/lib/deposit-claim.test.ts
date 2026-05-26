import { describe, expect, it } from "vitest";
import { damageClaimToHostCents } from "@/lib/deposit-claim";

const DEPOSIT = 50_000; // $500

describe("damageClaimToHostCents", () => {
  it("charges the full deposit when released to host", () => {
    expect(damageClaimToHostCents("released_to_host", DEPOSIT, null)).toBe(DEPOSIT);
  });

  it("charges nothing when returned to guest", () => {
    expect(damageClaimToHostCents("returned_to_guest", DEPOSIT, 40_000)).toBe(0);
  });

  it("charges the split amount when within the deposit", () => {
    expect(damageClaimToHostCents("split", DEPOSIT, 20_000)).toBe(20_000);
  });

  it("caps a split at the deposit amount", () => {
    expect(damageClaimToHostCents("split", DEPOSIT, 999_999)).toBe(DEPOSIT);
  });

  it("treats a zero or negative split as no charge", () => {
    expect(damageClaimToHostCents("split", DEPOSIT, 0)).toBe(0);
    expect(damageClaimToHostCents("split", DEPOSIT, -100)).toBe(0);
    expect(damageClaimToHostCents("split", DEPOSIT, null)).toBe(0);
  });

  it("never returns negative for a nonsensical deposit", () => {
    expect(damageClaimToHostCents("released_to_host", -1, null)).toBe(0);
  });
});

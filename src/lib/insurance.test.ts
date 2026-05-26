import { describe, expect, it } from "vitest";
import { isInsuranceCurrent } from "@/lib/insurance";

const NOW = 1_700_000_000;
const DAY = 86_400;

describe("isInsuranceCurrent", () => {
  it("passes when verified and expiry is in the future", () => {
    expect(isInsuranceCurrent({ insuranceStatus: "verified", insuranceExpiryDate: NOW + 30 * DAY }, NOW)).toBe(true);
  });

  it("fails when verified but the policy has expired", () => {
    expect(isInsuranceCurrent({ insuranceStatus: "verified", insuranceExpiryDate: NOW - DAY }, NOW)).toBe(false);
  });

  it("fails when verified but no expiry date is recorded", () => {
    expect(isInsuranceCurrent({ insuranceStatus: "verified", insuranceExpiryDate: null }, NOW)).toBe(false);
  });

  it.each(["none", "pending", "rejected", "expired"] as const)(
    "fails when status is %s even with a future expiry",
    (status) => {
      expect(isInsuranceCurrent({ insuranceStatus: status, insuranceExpiryDate: NOW + 30 * DAY }, NOW)).toBe(false);
    },
  );

  it("fails for a missing host profile", () => {
    expect(isInsuranceCurrent(null, NOW)).toBe(false);
    expect(isInsuranceCurrent(undefined, NOW)).toBe(false);
  });

  it("treats the exact expiry second as expired (strictly greater than now)", () => {
    expect(isInsuranceCurrent({ insuranceStatus: "verified", insuranceExpiryDate: NOW }, NOW)).toBe(false);
  });
});

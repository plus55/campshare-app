import { describe, expect, it } from "vitest";
import { fmtNzd } from "@/lib/money";

describe("fmtNzd", () => {
  it("preserves cents in transactional totals", () => {
    expect(fmtNzd(341)).toBe("$3.41");
  });

  it("omits redundant decimals for whole-dollar amounts", () => {
    expect(fmtNzd(15_000)).toBe("$150");
  });
});

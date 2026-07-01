import { describe, expect, it } from "vitest";
import {
  AP_CALC_AB_DIVISION_KEY,
  AP_CALC_AB_DIVISION_NAME,
  assertAllowedArenaDivisionKey,
  filterArenaDivisions,
  isApCalcAbDivisionKey,
  sumArenaDivisionXp,
} from "@/features/divisions/ap-calc-ab-division";

describe("ap-calc-ab-division", () => {
  it("recognizes the canonical division key", () => {
    expect(isApCalcAbDivisionKey(AP_CALC_AB_DIVISION_KEY)).toBe(true);
    expect(isApCalcAbDivisionKey("biology")).toBe(false);
  });

  it("filters legacy subject divisions out of arena lists", () => {
    const filtered = filterArenaDivisions([
      { key: "biology", name: "Biology Division", description: "cells" },
      { key: AP_CALC_AB_DIVISION_KEY, name: AP_CALC_AB_DIVISION_NAME, description: "calc" },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.key).toBe(AP_CALC_AB_DIVISION_KEY);
  });

  it("rejects non-ap-calc duel division keys", () => {
    expect(assertAllowedArenaDivisionKey("biology").ok).toBe(false);
    expect(assertAllowedArenaDivisionKey(AP_CALC_AB_DIVISION_KEY).ok).toBe(true);
  });

  it("sums legacy general XP into the arena bucket", () => {
    expect(
      sumArenaDivisionXp({
        general: 75,
        "ap-calculus-ab": 10,
      }),
    ).toBe(85);
  });
});

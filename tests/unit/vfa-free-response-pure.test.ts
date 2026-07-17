import { describe, expect, it } from "vitest";
import {
  FREE_RESPONSE_ROLLING_WEIGHT,
  vfaAccuracyPct,
  vfaGradingKey,
  vfaIsCorrectFromAccuracy,
  vfaRollingPoints,
  vfaRollingWeightIncrement,
} from "@/features/quest/vfa-free-response-pure";

describe("vfa-free-response-pure", () => {
  it("maps full, partial, and zero accuracy", () => {
    expect(vfaAccuracyPct({ correct: true })).toBe(1);
    expect(vfaAccuracyPct({ correct: false, partialCreditFraction: 0.5 })).toBe(0.5);
    expect(vfaAccuracyPct({ correct: false })).toBe(0);
  });

  it("treats full credit as correct for rank boolean", () => {
    expect(vfaIsCorrectFromAccuracy(1)).toBe(true);
    expect(vfaIsCorrectFromAccuracy(0.5)).toBe(false);
    expect(vfaIsCorrectFromAccuracy(0)).toBe(false);
  });

  it("weights free response 1.5x in rolling stats", () => {
    expect(vfaRollingWeightIncrement("mcq")).toBe(1);
    expect(vfaRollingWeightIncrement("free_response")).toBe(FREE_RESPONSE_ROLLING_WEIGHT);
    expect(vfaRollingWeightIncrement("multi_part_part")).toBe(FREE_RESPONSE_ROLLING_WEIGHT);
    expect(vfaRollingPoints(0.8, "free_response")).toBe(120);
    expect(vfaRollingPoints(0.8, "mcq")).toBe(80);
  });

  it("normalizes grading keys", () => {
    expect(vfaGradingKey("a")).toBe("a");
    expect(vfaGradingKey(null)).toBe("");
  });
});

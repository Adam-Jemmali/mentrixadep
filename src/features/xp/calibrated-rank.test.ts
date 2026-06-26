import { describe, expect, it } from "vitest";
import {
  formatOrdinalPercentile,
  formatVerifiedFirstAttemptSummary,
  formatVerifiedRankNextAction,
  formatVerifiedRankVerdict,
  rankLevelFromAccuracy,
  rankLevelFromPercentile,
} from "@/features/xp/calibrated-rank";

describe("rankLevelFromPercentile", () => {
  it("maps low percentile to Wanderer and high to Mentrixer", () => {
    expect(rankLevelFromPercentile(0)).toBe(1);
    expect(rankLevelFromPercentile(100)).toBe(7);
    expect(rankLevelFromPercentile(50)).toBeGreaterThan(1);
    expect(rankLevelFromPercentile(50)).toBeLessThan(7);
  });
});

describe("rankLevelFromAccuracy", () => {
  it("uses the same XP ladder scale as percentile", () => {
    expect(rankLevelFromAccuracy(0)).toBe(1);
    expect(rankLevelFromAccuracy(100)).toBe(7);
    expect(rankLevelFromAccuracy(50)).toBe(rankLevelFromPercentile(50));
  });
});

describe("formatOrdinalPercentile", () => {
  it("formats ordinals correctly", () => {
    expect(formatOrdinalPercentile(1)).toBe("1st percentile");
    expect(formatOrdinalPercentile(2)).toBe("2nd percentile");
    expect(formatOrdinalPercentile(3)).toBe("3rd percentile");
    expect(formatOrdinalPercentile(4)).toBe("4th percentile");
    expect(formatOrdinalPercentile(11)).toBe("11th percentile");
    expect(formatOrdinalPercentile(45)).toBe("45th percentile");
  });
});

describe("formatVerifiedFirstAttemptSummary", () => {
  it("builds the rank card line when eligible", () => {
    const line = formatVerifiedFirstAttemptSummary({
      verifiedCount: 12,
      accuracyPercent: 72,
      percentile: 45,
    });
    expect(line).toBe(
      "72 percent first attempt accuracy across 12 verified AP Calculus AB skills, 45th percentile"
    );
  });

  it("returns null before five verified skills", () => {
    expect(
      formatVerifiedFirstAttemptSummary({
        verifiedCount: 4,
        accuracyPercent: 80,
        percentile: null,
      })
    ).toBeNull();
  });
});

describe("formatVerifiedRankVerdict", () => {
  it("builds percentile receipt when eligible", () => {
    expect(
      formatVerifiedRankVerdict({
        verifiedCount: 12,
        accuracyPercent: 76,
        percentile: 11,
      })
    ).toContain("76% first-attempt accuracy");
  });

  it("guides user before five verified skills", () => {
    expect(
      formatVerifiedRankNextAction({
        verifiedCount: 2,
        accuracyPercent: 50,
        percentile: null,
      })
    ).toContain("verify 3 more");
  });
});

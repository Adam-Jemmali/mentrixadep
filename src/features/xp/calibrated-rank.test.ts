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

  it("maps accuracy to tier independently of cohort percentile", () => {
    expect(rankLevelFromPercentile(99)).toBeGreaterThan(rankLevelFromAccuracy(15));
    expect(rankLevelFromAccuracy(15)).toBe(4);
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
    expect(line).toContain("9 right out of 12 first answers");
    expect(line).toContain("beat 45 out of every 100");
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
  it("builds peer standing receipt when eligible", () => {
    expect(
      formatVerifiedRankVerdict({
        verifiedCount: 12,
        accuracyPercent: 76,
        percentile: 89,
      })
    ).toContain("first answers");
    expect(
      formatVerifiedRankVerdict({
        verifiedCount: 12,
        accuracyPercent: 76,
        percentile: 89,
      })
    ).toContain("Top 11%");
  });

  it("guides user before five verified skills", () => {
    expect(
      formatVerifiedRankNextAction({
        verifiedCount: 2,
        accuracyPercent: 50,
        percentile: null,
      })
    ).toMatch(/verify 3 more/i);
  });
});

import { describe, expect, it } from "vitest";
import {
  estimateCorrectFirstAttempts,
  explainFirstAttemptAccuracy,
  explainPeerStanding,
  formatPeerStandingRow,
  peerBeatCount,
  peerTopPercent,
} from "@/features/xp/rank-statistics-pure";

describe("rank-statistics-pure", () => {
  it("reconstructs correct count from rounded accuracy", () => {
    expect(estimateCorrectFirstAttempts(80, 5)).toBe(4);
    expect(estimateCorrectFirstAttempts(72, 12)).toBe(9);
  });

  it("explains accuracy as division times 100", () => {
    expect(explainFirstAttemptAccuracy(5, 80)).toBe(
      "4 right out of 5 first answers. 4 ÷ 5 × 100 = 80%.",
    );
  });

  it("maps CUME_DIST percentile to beat count and top percent", () => {
    expect(peerBeatCount(92)).toBe(92);
    expect(peerTopPercent(92)).toBe(8);
    expect(formatPeerStandingRow(92)).toBe("Beat 92/100 · top 8%");
  });

  it("describes peer standing in plain language", () => {
    expect(explainPeerStanding(45)).toContain("beat 45 out of every 100");
    expect(explainPeerStanding(45)).toContain("Top 55%");
  });
});

import { describe, expect, it } from "vitest";
import {
  explainPeerStanding,
  formatPeerStandingShort,
  formatPeerStandingWithCohort,
  peerAheadCount,
  peerBeatCount,
  peerTopPercent,
} from "@/features/xp/rank-statistics-pure";

describe("rank-statistics-pure", () => {
  it("maps percentile rank to top percent", () => {
    expect(peerBeatCount(92)).toBe(92);
    expect(peerTopPercent(92)).toBe(8);
  });

  it("converts percentile to real cohort head count", () => {
    expect(peerAheadCount(45, 20)).toBe(9);
    expect(peerAheadCount(0, 12)).toBe(0);
    expect(formatPeerStandingWithCohort(45, 20, 8).value).toBe("9 of 20 Mentrixers");
  });

  it("describes peer standing with real cohort size", () => {
    expect(explainPeerStanding(45, 20, 8)).toContain("Ahead of 9 of 20 Mentrixers");
    expect(explainPeerStanding(0, 12, 25)).toContain("Ahead of 0 of 12 Mentrixers");
    expect(explainPeerStanding(0, 12, 25)).not.toContain("100 Mentrixers");
  });

  it("never invents 100 when cohort size is known", () => {
    expect(formatPeerStandingShort(45, 20)).toBe("9 of 20");
    expect(formatPeerStandingShort(0, 12)).toBe("0 of 12");
  });
});

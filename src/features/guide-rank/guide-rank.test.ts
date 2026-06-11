import { describe, expect, it } from "vitest";
import { getGuideRankProgress, maxImpactScore } from "@/features/guide-rank/calculate-pure";
import { getGuideRankDefinition } from "@/features/guide-rank/constants";

describe("guide rank ladder", () => {
  it("maps expert rank styling", () => {
    expect(getGuideRankDefinition("expert").label).toBe("EXPERT");
  });

  it("computes progress toward expert from specialist", () => {
    const p = getGuideRankProgress({
      rankKey: "specialist",
      sessionsCompleted: 35,
      maxImpactScore: 75,
    });
    expect(p.next?.key).toBe("expert");
    expect(p.progressLabel).toContain("EXPERT");
    expect(p.sessionsNeeded).toBe(15);
  });

  it("picks max impact across subjects", () => {
    expect(
      maxImpactScore([
        { impactScore: 72, sessionsCounted: 5 },
        { impactScore: 88, sessionsCounted: 4 },
      ]),
    ).toBe(88);
  });
});

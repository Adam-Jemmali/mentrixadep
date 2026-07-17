import { describe, expect, it } from "vitest";
import {
  briefVerifyLabel,
  buildRankDeltaVerdict,
} from "@/features/guidance/verdict-engine-pure";

describe("VerdictPanel public passport behavior", () => {
  it("rank_delta verdict includes changed and reason for public copy", () => {
    const verdict = buildRankDeltaVerdict(
      { accuracyPercent: 71, percentile: 99, verifiedCount: 7 },
      { accuracyPercent: 67, percentile: 95 },
      [{ nodeName: "One sided limits", isCorrect: true, skillNodeId: "a" }],
    );
    expect(verdict.changed).toContain("67→71");
    expect(verdict.reason).toContain("One sided limits");
    expect(verdict.nextAction.label.length).toBeGreaterThan(0);
    expect(verdict.nextAction.label.length).toBeLessThanOrEqual(28);
    expect(verdict.rankDelta).toBeTruthy();
  });

  it("keeps verify CTAs brief", () => {
    expect(briefVerifyLabel("Limits")).toBe("Verify Limits");
    expect(briefVerifyLabel("One sided limits at infinity")).toBe("Verify next");
  });
});

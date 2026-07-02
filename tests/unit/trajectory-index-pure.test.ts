import { describe, expect, it } from "vitest";
import {
  buildTrajectoryIndex,
  trajectoryIndexSocialProofLine,
} from "@/features/trajectory-index/trajectory-index-pure";

describe("buildTrajectoryIndex", () => {
  it("weights verified nodes, retests, and loops into a 0-100 score", () => {
    const result = buildTrajectoryIndex({
      verifiedNodesGained30d: 10,
      retestsCompleted30d: 4,
      retestsDuePast30d: 1,
      positiveLoops30d: 5,
    });
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.verifiedComponent).toBe(100);
    expect(result.verdict).toContain("Trajectory Index");
    expect(result.nextAction.length).toBeGreaterThan(10);
  });

  it("prioritizes overdue retest in next action", () => {
    const result = buildTrajectoryIndex({
      verifiedNodesGained30d: 0,
      retestsCompleted30d: 0,
      retestsDuePast30d: 2,
      positiveLoops30d: 0,
    });
    expect(result.nextAction).toContain("overdue retest");
  });
});

describe("trajectoryIndexSocialProofLine", () => {
  it("returns tiered copy", () => {
    expect(trajectoryIndexSocialProofLine(80)).toContain("strong Trajectory Index");
    expect(trajectoryIndexSocialProofLine(50)).toContain("ties weekly receipts");
    expect(trajectoryIndexSocialProofLine(10)).toContain("not guesswork");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildLoopVelocityIndex,
  buildOpenLoopProofSteps,
  buildProofChainPanelData,
  projectTrajectoryLiftIfOverdueClosed,
  stallDaysSince,
} from "@/features/momentum-hub/proof-chain-pure";
import { buildTrajectoryIndex } from "@/features/trajectory-index/trajectory-index-pure";

describe("projectTrajectoryLiftIfOverdueClosed", () => {
  it("projects lift when closing an overdue retest", () => {
    const trajectory = buildTrajectoryIndex({
      verifiedNodesGained30d: 2,
      retestsCompleted30d: 0,
      retestsDuePast30d: 2,
      positiveLoops30d: 0,
    });

    const counterfactual = projectTrajectoryLiftIfOverdueClosed(trajectory);
    expect(counterfactual).not.toBeNull();
    expect(counterfactual!.projectedScore).toBeGreaterThan(counterfactual!.currentScore);
    expect(counterfactual!.lift).toBeGreaterThan(0);
  });
});

describe("buildLoopVelocityIndex", () => {
  it("scores faster closure higher than cohort", () => {
    const fast = buildLoopVelocityIndex({
      userMedianClosureHours: 20,
      cohortMedianClosureHours: 40,
      closedLoops30d: 3,
    });
    const slow = buildLoopVelocityIndex({
      userMedianClosureHours: 60,
      cohortMedianClosureHours: 40,
      closedLoops30d: 3,
    });

    expect(fast!.score).toBeGreaterThan(slow!.score);
  });
});

describe("buildOpenLoopProofSteps", () => {
  it("marks retest as current when due", () => {
    const steps = buildOpenLoopProofSteps({
      nodeName: "Chain rule",
      skillNodeId: "node-1",
      sourceType: "session",
      scheduledFor: new Date(Date.now() - 86400000).toISOString(),
      preAccuracy: 0.4,
      isDue: true,
      priorityRetest: true,
      stallDays: 1,
    });

    expect(steps.find((s) => s.id === "retest")?.status).toBe("current");
    expect(steps.find((s) => s.id === "wait")?.status).toBe("stalled");
  });
});

describe("buildProofChainPanelData", () => {
  it("returns teaser for free users", () => {
    const panel = buildProofChainPanelData({
      momentumActive: false,
      openLoop: {
        skillNodeId: "n1",
        nodeName: "Limits",
        sourceType: "session",
        scheduledFor: new Date().toISOString(),
        preAccuracy: 0.5,
        isDue: true,
        priorityRetest: false,
        stallDays: 1,
      },
      closedLoop: null,
      trajectory: null,
      loopVelocity: null,
      closedLoops30d: 0,
      totalLoops30d: 0,
    });

    expect(panel?.mode).toBe("teaser");
  });
});

describe("stallDaysSince", () => {
  it("counts full days overdue", () => {
    const twoDaysAgo = new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString();
    expect(stallDaysSince(twoDaysAgo)).toBe(2);
  });
});

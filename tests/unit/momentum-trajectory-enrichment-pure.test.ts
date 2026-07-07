import { describe, expect, it } from "vitest";
import {
  buildGoalRunwaySummary,
  identifyTrajectoryBottleneck,
  trajectoryScoreBand,
  trajectoryWeekOverWeekDelta,
} from "@/features/momentum-hub/momentum-trajectory-enrichment-pure";
import { buildTrajectoryIndex } from "@/features/trajectory-index/trajectory-index-pure";

describe("identifyTrajectoryBottleneck", () => {
  it("flags retest closure as bottleneck when lowest", () => {
    const trajectory = buildTrajectoryIndex({
      verifiedNodesGained30d: 5,
      retestsCompleted30d: 0,
      retestsDuePast30d: 2,
      positiveLoops30d: 2,
    });

    const bottleneck = identifyTrajectoryBottleneck(trajectory);
    expect(bottleneck.component).toBe("retest");
    expect(bottleneck.fixAction).toContain("retest");
  });
});

describe("trajectoryWeekOverWeekDelta", () => {
  it("formats positive movement", () => {
    expect(trajectoryWeekOverWeekDelta(45, 33)).toBe("+12 vs last week");
  });

  it("formats stalled movement", () => {
    expect(trajectoryWeekOverWeekDelta(20, 28)).toBe("-8 — movement stalled");
  });
});

describe("trajectoryScoreBand", () => {
  it("maps score to band", () => {
    expect(trajectoryScoreBand(20)).toBe("0–39 stalled");
    expect(trajectoryScoreBand(55)).toBe("40–69 building");
    expect(trajectoryScoreBand(80)).toBe("70–100 strong");
  });
});

describe("buildGoalRunwaySummary", () => {
  it("marks behind pace when weekly actual is low", () => {
    const runway = buildGoalRunwaySummary({
      goal: { verifiedNodeCount: 10, daysUntilExam: 30 },
      verifiedNodesGained30d: 2,
      totalSkillNodes: 50,
    });

    expect(runway?.onTrack).toBe(false);
    expect(runway?.verdict).toContain("Behind pace");
  });
});

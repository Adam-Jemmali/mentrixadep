import { describe, expect, it } from "vitest";
import {
  buildMomentumPlaybook,
  buildRetestGuidedAction,
  daysUntilCreditExpiry,
  retestQuestHref,
} from "@/features/momentum-hub/momentum-value-equation-pure";
import { identifyTrajectoryBottleneck } from "@/features/momentum-hub/momentum-trajectory-enrichment-pure";
import { buildTrajectoryIndex } from "@/features/trajectory-index/trajectory-index-pure";

describe("retestQuestHref", () => {
  it("deep links to node retest", () => {
    const href = retestQuestHref("Chain rule", "abc-123");
    expect(href).toContain("Retest%20Chain%20rule");
    expect(href).toContain("retestNode=abc-123");
  });
});

describe("buildRetestGuidedAction", () => {
  it("surfaces value equation chips with trajectory lift", () => {
    const action = buildRetestGuidedAction({
      nodeName: "Limits",
      skillNodeId: "n1",
      isDue: true,
      counterfactual: { currentScore: 20, projectedScore: 35, lift: 15, verdict: "v", nextAction: "n" },
      closedLoops30d: 2,
      totalLoops30d: 4,
    });

    expect(action.chips.dreamOutcome).toContain("+15");
    expect(action.chips.effort).toContain("1 tap");
    expect(action.label).toContain("Limits");
  });
});

describe("buildMomentumPlaybook", () => {
  it("picks due retest as primary move", () => {
    const playbook = buildMomentumPlaybook({
      pendingRetest: {
        skillNodeId: "n1",
        nodeName: "Limits",
        scheduledFor: new Date().toISOString(),
        isDue: true,
        remainingMs: 0,
        priorityRetest: true,
      },
      counterfactual: { currentScore: 20, projectedScore: 30, lift: 10, verdict: "v", nextAction: "n" },
      sessionCreditsRemaining: 1,
      creditExpiryLabel: "Apr 30",
      weakestNodeName: null,
      bottleneck: null,
      closedLoops30d: 1,
      totalLoops30d: 2,
      creditExpiresWithinDays: 20,
    });

    expect(playbook?.rank).toBe("retest_due");
    expect(playbook?.primary.href).toContain("retestNode=n1");
  });

  it("picks expiring credit when no retest due", () => {
    const trajectory = buildTrajectoryIndex({
      verifiedNodesGained30d: 2,
      retestsCompleted30d: 1,
      retestsDuePast30d: 0,
      positiveLoops30d: 1,
    });
    const playbook = buildMomentumPlaybook({
      pendingRetest: null,
      counterfactual: null,
      sessionCreditsRemaining: 1,
      creditExpiryLabel: "Apr 5",
      weakestNodeName: "Chain rule",
      bottleneck: identifyTrajectoryBottleneck(trajectory),
      closedLoops30d: 1,
      totalLoops30d: 1,
      creditExpiresWithinDays: 5,
    });

    expect(playbook?.rank).toBe("credit_expiring");
    expect(playbook?.primary.label).toContain("Chain rule");
  });
});

describe("daysUntilCreditExpiry", () => {
  it("returns days until month end", () => {
    const days = daysUntilCreditExpiry("2026-07-01", new Date("2026-07-15T12:00:00.000Z"));
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(17);
  });
});

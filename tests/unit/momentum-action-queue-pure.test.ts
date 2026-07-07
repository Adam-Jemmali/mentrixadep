import { describe, expect, it } from "vitest";
import { buildMomentumActionQueue } from "@/features/momentum-hub/momentum-action-queue-pure";
import type { LoopReportRow } from "@/features/intervention-retests/retest-reads";

const pendingDue = {
  skillNodeId: "node-1",
  nodeName: "Derivative of a constant",
  scheduledFor: new Date().toISOString(),
  isDue: true,
  remainingMs: 0,
  priorityRetest: true,
};

const closedLoop: LoopReportRow = {
  id: "loop-1",
  skillNodeId: "node-2",
  nodeName: "Chain rule",
  sourceType: "session",
  scheduledFor: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  preAccuracy: 0.4,
  postAccuracy: 0.8,
  delta: 0.4,
  isDue: false,
};

describe("buildMomentumActionQueue", () => {
  it("prioritizes due retest with deep link CTA", () => {
    const { items } = buildMomentumActionQueue({
      pendingRetest: pendingDue,
      closedLoops: [closedLoop],
      sessionCreditsRemaining: 1,
      creditExpiryLabel: "Apr 30",
      weakestNodeName: "Limits",
      weakestNodeId: "node-limits",
      guideMemory: null,
      momentumActive: true,
      counterfactual: { currentScore: 20, projectedScore: 32, lift: 12, verdict: "v", nextAction: "n" },
      closedLoops30d: 2,
      totalLoops30d: 3,
    });

    expect(items[0]?.kind).toBe("retest_due");
    expect(items[0]?.ctaHref).toContain("retestNode=node-1");
    expect(items[0]?.ctaLabel).toContain("Derivative of a constant");
  });

  it("dedupes closed loop when same node is due for retest", () => {
    const dueOnSameNode = { ...pendingDue, skillNodeId: closedLoop.skillNodeId };
    const { items } = buildMomentumActionQueue({
      pendingRetest: dueOnSameNode,
      closedLoops: [closedLoop],
      sessionCreditsRemaining: 0,
      creditExpiryLabel: null,
      weakestNodeName: null,
      weakestNodeId: null,
      guideMemory: null,
      momentumActive: true,
      counterfactual: null,
      closedLoops30d: 1,
      totalLoops30d: 2,
    });

    expect(items.filter((item) => item.kind === "closed_loop_followup")).toHaveLength(0);
  });

  it("limits free users to one row with upsell", () => {
    const { items, upsellLine } = buildMomentumActionQueue({
      pendingRetest: pendingDue,
      closedLoops: [],
      sessionCreditsRemaining: 0,
      creditExpiryLabel: null,
      weakestNodeName: "Limits",
      weakestNodeId: null,
      guideMemory: null,
      momentumActive: false,
      counterfactual: null,
      closedLoops30d: 0,
      totalLoops30d: 0,
    });

    expect(items).toHaveLength(1);
    expect(upsellLine).toContain("Momentum");
  });
});

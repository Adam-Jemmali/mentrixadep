import { describe, expect, it } from "vitest";
import {
  buildWeeklyTaughtNodeVerdict,
  mapWeeklyNodeImpacts,
} from "@/features/tutor/command-center-weekly-impact-pure";

describe("command center weekly impact pure", () => {
  it("returns a directive when retest data is missing", () => {
    const verdict = buildWeeklyTaughtNodeVerdict("Chain rule", null);
    expect(verdict.changed).toContain("Chain rule");
    expect(verdict.reason).toContain("retest");
    expect(verdict.nextAction.href).toBe("/tutor/sessions-ai");
  });

  it("returns a positive verdict when lift is above zero", () => {
    const verdict = buildWeeklyTaughtNodeVerdict("Chain rule", {
      skillNodeId: "node-1",
      nodeName: "Chain rule",
      impactScore: 82,
      impactLift: 8,
      afterAccuracy: 82,
      beforeAccuracy: 74,
    });

    expect(verdict.changed).toContain("Chain rule");
    expect(verdict.reason).toContain("improved");
  });

  it("maps taught nodes to per-node verdicts", () => {
    const rows = mapWeeklyNodeImpacts(
      [{ skillNodeId: "node-1", nodeName: "Power rule" }],
      new Map(),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.nodeName).toBe("Power rule");
    expect(rows[0]?.verdict.changed).toContain("Power rule");
  });
});

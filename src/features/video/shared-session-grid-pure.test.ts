import { describe, expect, it } from "vitest";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import {
  applyKnowledgeRowToGrid,
  mergePinnedAndFlaggedNodes,
  parseSharedSessionBroadcast,
  sharedSessionGridVerdict,
  SHARED_SESSION_BROADCAST,
} from "@/features/video/shared-session-grid-pure";

function sampleGrid(): MasteryGridData {
  return {
    subject: "AP Calculus AB",
    nextActionLine: "Practice limits",
    units: [
      {
        unitNumber: 1,
        unitName: "Limits",
        nodes: [
          {
            id: "node-a",
            nodeName: "Limit definition",
            nodeSlug: "limit-definition",
            displayOrder: 1,
            state: "weak",
            accuracyPercent: 40,
            practiceAttempts: 5,
            practiceCorrect: 2,
            hasVerifiedAttempt: false,
            verifiedCorrect: null,
            peerBetterThanPercent: null,
          },
        ],
      },
    ],
  };
}

describe("mergePinnedAndFlaggedNodes", () => {
  it("dedupes session targets and flagged nodes", () => {
    expect(mergePinnedAndFlaggedNodes(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });
});

describe("applyKnowledgeRowToGrid", () => {
  it("returns bloom when practice stats improve state", () => {
    const grid = sampleGrid();
    const verified = new Map<string, { isCorrect: boolean }>();
    const { grid: next, bloom } = applyKnowledgeRowToGrid(
      grid,
      { skill_node_id: "node-a", attempts: 10, correct: 8 },
      verified,
    );
    expect(bloom).toEqual({
      nodeId: "node-a",
      fromState: "weak",
      toState: "proficient",
    });
    expect(next.units[0]!.nodes[0]!.state).toBe("proficient");
  });

  it("skips when nothing changed", () => {
    const grid = sampleGrid();
    const verified = new Map<string, { isCorrect: boolean }>();
    const { bloom } = applyKnowledgeRowToGrid(
      grid,
      { skill_node_id: "node-a", attempts: 5, correct: 2 },
      verified,
    );
    expect(bloom).toBeNull();
  });
});

describe("parseSharedSessionBroadcast", () => {
  it("parses bloom events", () => {
    const parsed = parseSharedSessionBroadcast(SHARED_SESSION_BROADCAST.bloom, {
      nodeId: "n1",
      fromState: "weak",
      toState: "proficient",
    });
    expect(parsed?.type).toBe("grid-bloom");
  });

  it("parses guide notes", () => {
    const parsed = parseSharedSessionBroadcast(SHARED_SESSION_BROADCAST.note, {
      nodeId: "n1",
      nodeName: "Chain rule",
      note: "Slow down on inner function.",
      guideName: "Alex",
    });
    expect(parsed?.type).toBe("guide-note");
  });
});

describe("sharedSessionGridVerdict", () => {
  it("returns guide copy with flags", () => {
    const v = sharedSessionGridVerdict("guide", 2, 1);
    expect(v.verdict).toContain("flagged");
    expect(v.nextAction.length).toBeGreaterThan(10);
  });

  it("returns student copy with pins", () => {
    const v = sharedSessionGridVerdict("student", 3, 0);
    expect(v.verdict).toContain("session target");
  });
});

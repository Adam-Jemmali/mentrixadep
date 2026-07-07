import { describe, expect, it } from "vitest";
import {
  buildMasteryGridNextAction,
  groupSkillNodesIntoUnits,
  pickQuestMasteryHighlight,
  resolveMasteryNodeState,
  splitMasteryGridByPinned,
} from "@/features/mastery-grid/mastery-grid-pure";

describe("resolveMasteryNodeState", () => {
  it("returns verified gold path when first attempt was correct", () => {
    expect(resolveMasteryNodeState({ isCorrect: true }, null)).toEqual({
      state: "verified",
      accuracyPercent: 100,
    });
  });

  it("returns weak when verified first attempt was wrong", () => {
    expect(resolveMasteryNodeState({ isCorrect: false }, { attempts: 3, correct: 2 })).toEqual({
      state: "weak",
      accuracyPercent: 0,
    });
  });

  it("uses knowledge accuracy when not verified", () => {
    expect(resolveMasteryNodeState(null, { attempts: 4, correct: 3 })).toEqual({
      state: "proficient",
      accuracyPercent: 75,
    });
    expect(resolveMasteryNodeState(null, { attempts: 4, correct: 2 })).toEqual({
      state: "weak",
      accuracyPercent: 50,
    });
  });

  it("returns none when untouched", () => {
    expect(resolveMasteryNodeState(null, null)).toEqual({
      state: "none",
      accuracyPercent: null,
    });
  });
});

describe("buildMasteryGridNextAction", () => {
  it("suggests first unit one node when nothing attempted", () => {
    const line = buildMasteryGridNextAction([
      {
        unitNumber: 1,
        unitName: "Limits",
        nodes: [
          {
            id: "a",
            nodeName: "Introducing limits",
            nodeSlug: "intro-limits",
            displayOrder: 1,
            state: "none",
            accuracyPercent: null,
          },
        ],
      },
    ]);
    expect(line).toBe("Start: Introducing limits");
  });

  it("suggests weakest attempted node", () => {
    const line = buildMasteryGridNextAction([
      {
        unitNumber: 1,
        unitName: "Limits",
        nodes: [
          {
            id: "a",
            nodeName: "Chain rule",
            nodeSlug: "chain",
            displayOrder: 2,
            state: "weak",
            accuracyPercent: 40,
          },
          {
            id: "b",
            nodeName: "Product rule",
            nodeSlug: "product",
            displayOrder: 1,
            state: "proficient",
            accuracyPercent: 80,
          },
        ],
      },
    ]);
    expect(line).toBe("Practice Chain rule — 40% now.");
  });
});

describe("groupSkillNodesIntoUnits", () => {
  it("groups nodes by unit in display order", () => {
    const units = groupSkillNodesIntoUnits(
      [
        {
          id: "2",
          unit_number: 2,
          unit_name: "Derivatives",
          node_name: "Power rule",
          node_slug: "power",
          display_order: 3,
        },
        {
          id: "1",
          unit_number: 1,
          unit_name: "Limits",
          node_name: "Limits intro",
          node_slug: "limits",
          display_order: 1,
        },
      ],
      () => ({ state: "none", accuracyPercent: null })
    );
    expect(units).toHaveLength(2);
    expect(units[0]?.unitNumber).toBe(1);
    expect(units[1]?.nodes[0]?.nodeName).toBe("Power rule");
  });
});

describe("pickQuestMasteryHighlight", () => {
  const grid = (nodes: Array<{ id: string; nodeName: string; state: "none" | "weak" | "proficient" | "verified" }>) => ({
    subject: "AP Calculus AB",
    nextActionLine: "",
    units: [
      {
        unitNumber: 1,
        unitName: "Limits",
        nodes: nodes.map((node, index) => ({
          ...node,
          nodeSlug: node.id,
          displayOrder: index + 1,
          accuracyPercent: node.state === "verified" ? 100 : node.state === "none" ? null : 50,
        })),
      },
    ],
  });

  it("reports a state transition for the strongest change", () => {
    const before = {
      a: { nodeName: "Limits intro", state: "none" as const, accuracyPercent: null },
      b: { nodeName: "Chain rule", state: "weak" as const, accuracyPercent: 40 },
    };
    const after = grid([
      { id: "a", nodeName: "Limits intro", state: "verified" },
      { id: "b", nodeName: "Chain rule", state: "weak" },
    ]);
    const highlight = pickQuestMasteryHighlight(before, after, ["b", "a"]);
    expect(highlight?.nodeId).toBe("a");
    expect(highlight?.unchanged).toBe(false);
    expect(highlight?.verdictLine).toBe("Limits intro locked for rank on first try.");
  });

  it("reports held steady when no state changed", () => {
    const before = {
      a: { nodeName: "Chain rule", state: "weak" as const, accuracyPercent: 40 },
    };
    const after = grid([{ id: "a", nodeName: "Chain rule", state: "weak" }]);
    const highlight = pickQuestMasteryHighlight(before, after, ["a"]);
    expect(highlight?.unchanged).toBe(true);
    expect(highlight?.verdictLine).toBe(
      "Chain rule held steady — practice until the square turns green (70%+)."
    );
  });
});

describe("splitMasteryGridByPinned", () => {
  const data = {
    subject: "AP Calculus AB",
    nextActionLine: "Start Unit 1",
    units: [
      {
        unitNumber: 1,
        unitName: "Limits",
        nodes: [
          {
            id: "a",
            nodeName: "Intro",
            nodeSlug: "intro",
            displayOrder: 1,
            state: "none" as const,
            accuracyPercent: null,
          },
          {
            id: "b",
            nodeName: "Continuity",
            nodeSlug: "continuity",
            displayOrder: 2,
            state: "weak" as const,
            accuracyPercent: 40,
          },
        ],
      },
      {
        unitNumber: 2,
        unitName: "Derivatives",
        nodes: [
          {
            id: "c",
            nodeName: "Chain rule",
            nodeSlug: "chain",
            displayOrder: 1,
            state: "verified" as const,
            accuracyPercent: 100,
          },
        ],
      },
    ],
  };

  it("orders pinned nodes by the provided id list", () => {
    const { pinnedNodes } = splitMasteryGridByPinned(data, ["c", "a"]);
    expect(pinnedNodes.map((node) => node.id)).toEqual(["c", "a"]);
  });

  it("removes pinned nodes from remainder units", () => {
    const { remainderUnits } = splitMasteryGridByPinned(data, ["a", "c"]);
    expect(remainderUnits).toEqual([
      {
        unitNumber: 1,
        unitName: "Limits",
        nodes: [data.units[0]!.nodes[1]],
      },
    ]);
  });
});

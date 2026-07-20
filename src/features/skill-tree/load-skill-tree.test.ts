import { describe, expect, it } from "vitest";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import { buildSkillTreeData } from "@/features/skill-tree/load-skill-tree";

const grid: MasteryGridData = {
  subject: "AP Calculus AB",
  units: [
    {
      unitNumber: 1,
      unitName: "Limits",
      nodes: [
        {
          id: "root",
          nodeName: "Limit Foundations",
          nodeSlug: "limit-foundations",
          displayOrder: 1,
          state: "proficient",
          accuracyPercent: 80,
          practiceAttempts: 5,
          practiceCorrect: 4,
          hasVerifiedAttempt: false,
          verifiedCorrect: null,
          peerBetterThanPercent: null,
        },
        {
          id: "open-weak",
          nodeName: "One-Sided Limits",
          nodeSlug: "one-sided-limits",
          displayOrder: 2,
          state: "weak",
          accuracyPercent: 50,
          practiceAttempts: 2,
          practiceCorrect: 1,
          hasVerifiedAttempt: false,
          verifiedCorrect: null,
          peerBetterThanPercent: null,
        },
      ],
    },
    {
      unitNumber: 2,
      unitName: "Derivatives",
      nodes: [
        {
          id: "locked-weak",
          nodeName: "Chain Rule",
          nodeSlug: "chain-rule",
          displayOrder: 0,
          state: "weak",
          accuracyPercent: 0,
          practiceAttempts: 1,
          practiceCorrect: 0,
          hasVerifiedAttempt: false,
          verifiedCorrect: null,
          peerBetterThanPercent: null,
        },
      ],
    },
  ],
  nextActionLine: "Practice One-Sided Limits",
};

const skillNodes = [
  {
    id: "root",
    unit_number: 1,
    unit_name: "Limits",
    node_name: "Limit Foundations",
    node_slug: "limit-foundations",
    display_order: 1,
    prerequisites: [],
  },
  {
    id: "open-weak",
    unit_number: 1,
    unit_name: "Limits",
    node_name: "One-Sided Limits",
    node_slug: "one-sided-limits",
    display_order: 2,
    prerequisites: ["root"],
  },
  {
    id: "locked-weak",
    unit_number: 2,
    unit_name: "Derivatives",
    node_name: "Chain Rule",
    node_slug: "chain-rule",
    display_order: 0,
    prerequisites: ["open-weak"],
  },
];

describe("buildSkillTreeData", () => {
  it("keeps the full mastery grid as an exact node subset", () => {
    const tree = buildSkillTreeData(grid, skillNodes, [
      {
        skill_node_id: "open-weak",
        next_review_at: "2026-07-20T12:00:00.000Z",
      },
    ]);

    expect(tree.grid.units.flatMap((unit) => unit.nodes.map((node) => node.id))).toEqual(
      tree.nodes.map((node) => node.id),
    );
    expect(tree.nodes.find((node) => node.id === "open-weak")?.nextReviewAt).toBe(
      "2026-07-20T12:00:00.000Z",
    );
  });

  it("focuses the weakest attempted unlocked node", () => {
    const tree = buildSkillTreeData(grid, skillNodes, []);

    expect(tree.focusNodeId).toBe("open-weak");
    expect(tree.focusCause).toBeNull();
    expect(tree.mistakeItemCount).toBe(0);
    expect(tree.nodes.find((node) => node.id === "locked-weak")?.unlocked).toBe(false);
    expect(tree.frontier.focusId).toBe("open-weak");
  });

  it("honors focusCause override when unlocked", () => {
    const tree = buildSkillTreeData(grid, skillNodes, [], {
      tag: "power-rule",
      nodeId: "root",
    });
    expect(tree.focusNodeId).toBe("root");
    expect(tree.focusCause).toEqual({ tag: "power-rule", nodeId: "root" });
  });

  it("prefers unlocked review-due solid over weak focus", () => {
    const tree = buildSkillTreeData(
      grid,
      skillNodes,
      [
        {
          skill_node_id: "root",
          next_review_at: "2026-07-18T10:00:00.000Z",
        },
      ],
      null,
      new Date("2026-07-18T12:00:00.000Z"),
    );
    expect(tree.focusNodeId).toBe("root");
  });
});

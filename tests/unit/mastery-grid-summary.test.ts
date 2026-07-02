import { describe, expect, it } from "vitest";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import {
  filterMasteryNodesByQuery,
  pickDefaultMasteryUnitNumber,
  pickWeakestMasteryNodes,
  summarizeMasteryGrid,
} from "@/features/mastery-grid/mastery-grid-pure";

function sampleGrid(): MasteryGridData {
  return {
    subject: "AP Calculus AB",
    verdict: undefined,
    nextActionLine: "Start with limits.",
    units: [
      {
        unitNumber: 1,
        unitName: "Limits and Continuity",
        nodes: [
          {
            id: "a",
            nodeName: "Limits from graphs",
            nodeSlug: "limits-graphs",
            displayOrder: 1,
            state: "verified",
            accuracyPercent: 100,
          },
          {
            id: "b",
            nodeName: "One-sided limits",
            nodeSlug: "one-sided-limits",
            displayOrder: 2,
            state: "weak",
            accuracyPercent: 40,
          },
        ],
      },
      {
        unitNumber: 2,
        unitName: "Differentiation",
        nodes: [
          {
            id: "c",
            nodeName: "Power rule",
            nodeSlug: "power-rule",
            displayOrder: 1,
            state: "none",
            accuracyPercent: null,
          },
          {
            id: "d",
            nodeName: "Product rule",
            nodeSlug: "product-rule",
            displayOrder: 2,
            state: "weak",
            accuracyPercent: 55,
          },
        ],
      },
    ],
  };
}

describe("summarizeMasteryGrid", () => {
  it("counts states and progress percent", () => {
    const summary = summarizeMasteryGrid(sampleGrid());
    expect(summary.totalNodes).toBe(4);
    expect(summary.verifiedCount).toBe(1);
    expect(summary.proficientCount).toBe(0);
    expect(summary.weakCount).toBe(2);
    expect(summary.notStartedCount).toBe(1);
    expect(summary.progressPercent).toBe(25);
  });
});

describe("pickWeakestMasteryNodes", () => {
  it("returns lowest accuracy attempted nodes", () => {
    const weakest = pickWeakestMasteryNodes(sampleGrid(), 2);
    expect(weakest.map((node) => node.id)).toEqual(["b", "d"]);
  });
});

describe("pickDefaultMasteryUnitNumber", () => {
  it("prefers the unit with the most open skills", () => {
    expect(pickDefaultMasteryUnitNumber(sampleGrid())).toBe(2);
  });
});

describe("filterMasteryNodesByQuery", () => {
  it("matches node names and slugs case-insensitively", () => {
    const matches = filterMasteryNodesByQuery(sampleGrid(), "power");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.id).toBe("c");
    expect(matches[0]?.unitNumber).toBe(2);
  });
});

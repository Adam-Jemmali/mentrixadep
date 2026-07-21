import { describe, expect, it } from "vitest";
import {
  buildWorkingTowardLine,
  formatFocusSignalDisplay,
  pickGapNodeName,
  pickStrongestNodeName,
  pickWeakestTargetNodeId,
} from "@/features/pre-session-brief/guide-context-pure";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import { CALC_READINESS_LABEL } from "@/features/student-home/ap-readiness-band-pure";

function grid(): MasteryGridData {
  return {
    subject: "AP Calculus AB",
    nextActionLine: "Practice",
    units: [
      {
        unitNumber: 1,
        unitName: "Limits",
        nodes: [
          {
            id: "a",
            nodeName: "Limit laws",
            nodeSlug: "limit-laws",
            displayOrder: 1,
            state: "proficient",
            accuracyPercent: 80,
            practiceAttempts: 10,
            practiceCorrect: 8,
            hasVerifiedAttempt: false,
            verifiedCorrect: null,
            peerBetterThanPercent: null,
          },
          {
            id: "b",
            nodeName: "Chain rule",
            nodeSlug: "chain-rule",
            displayOrder: 2,
            state: "weak",
            accuracyPercent: 30,
            practiceAttempts: 12,
            practiceCorrect: 4,
            hasVerifiedAttempt: false,
            verifiedCorrect: null,
            peerBetterThanPercent: null,
          },
        ],
      },
    ],
  };
}

describe("guide-context-pure", () => {
  it("formats focus signal on a ten point scale", () => {
    expect(formatFocusSignalDisplay(0.42)).toBe("4.2/10.0");
    expect(formatFocusSignalDisplay(1)).toBe("10.0/10.0");
  });

  it("picks strongest and gap nodes", () => {
    const g = grid();
    expect(pickStrongestNodeName(g)).toBe("Limit laws");
    expect(pickGapNodeName(g)).toBe("Chain rule");
  });

  it("picks weakest target node id", () => {
    expect(pickWeakestTargetNodeId(grid(), ["a", "b"])).toBe("b");
  });

  it("builds working toward line with band score", () => {
    const line = buildWorkingTowardLine(
      {
        score: 3,
        label: CALC_READINESS_LABEL,
        sublabel: "Level 3",
        isVerifiedPrediction: true,
      },
      grid(),
      ["a", "b"],
      12,
    );
    expect(line).toContain("level 4");
    expect(line).toContain("2 nodes away");
  });
});

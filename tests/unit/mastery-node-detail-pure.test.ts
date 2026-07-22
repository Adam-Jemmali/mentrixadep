import { describe, expect, it } from "vitest";
import {
  betterThanToTopPercent,
  buildMasteryNodeDetailRows,
  buildMasteryNodeDetailVerdict,
  masteryNodeActionHref,
  masteryNodeActionLabel,
  masteryNodeShortStateLabel,
} from "@/features/mastery-grid/mastery-node-detail-pure";
import { defaultMasteryNodeStats } from "@/features/mastery-grid/mastery-grid-pure";
import type { MasteryGridNode } from "@/features/mastery-grid/types";

function node(overrides: Partial<MasteryGridNode> & Pick<MasteryGridNode, "state">): MasteryGridNode {
  return {
    id: "n1",
    nodeName: "Intermediate Value Theorem",
    nodeSlug: "intermediate-value-theorem",
    displayOrder: 1,
    accuracyPercent: null,
    ...defaultMasteryNodeStats(),
    ...overrides,
  };
}

describe("mastery-node-detail-pure", () => {
  it("maps better-than to top percent with bounds", () => {
    expect(betterThanToTopPercent(0)).toBe(100);
    expect(betterThanToTopPercent(72)).toBe(28);
    expect(betterThanToTopPercent(99.4)).toBe(1);
  });

  it("uses full state labels instead of truncated words", () => {
    expect(masteryNodeShortStateLabel("weak")).toBe("Under 70%");
    expect(masteryNodeShortStateLabel("none")).toBe("Open");
    expect(masteryNodeShortStateLabel("verified")).toBe("Verified");
  });

  it("shows practice accuracy with attempt counts", () => {
    const rows = buildMasteryNodeDetailRows(
      node({
        state: "weak",
        accuracyPercent: 0,
        practiceAttempts: 3,
        practiceCorrect: 0,
      }),
      null,
      0,
    );
    expect(rows.find((row) => row.label === "Practice accuracy")?.value).toBe(
      "0%. 0/3 right",
    );
  });

  it("shows per-node top percent when peer snapshot exists", () => {
    const rows = buildMasteryNodeDetailRows(
      node({
        state: "verified",
        accuracyPercent: 100,
        hasVerifiedAttempt: true,
        verifiedCorrect: true,
        peerBetterThanPercent: 80,
      }),
      null,
      0,
    );
    expect(rows.find((row) => row.label === "On this node")?.value).toBe(
      "Top 20% of verified Mentrixers",
    );
    expect(rows.find((row) => row.label === "On this node")?.gold).toBe(true);
  });

  it("shows overall rank top percent when calibrated", () => {
    const rows = buildMasteryNodeDetailRows(node({ state: "none" }), 12, 8);
    expect(rows.find((row) => row.label === "Overall rank")?.value).toBe(
      "Top 12% across 8 verified skills",
    );
  });

  it("routes proficient nodes to quest and weak nodes to practice", () => {
    const weak = node({ state: "weak", accuracyPercent: 40, practiceAttempts: 2, practiceCorrect: 1 });
    const proficient = node({
      state: "proficient",
      accuracyPercent: 78,
      practiceAttempts: 5,
      practiceCorrect: 4,
    });
    expect(masteryNodeActionHref(weak)).toContain("quest");
    expect(masteryNodeActionHref(proficient)).toContain("prompt=");
    expect(masteryNodeActionLabel(proficient)).toContain("Quest");
    expect(masteryNodeActionLabel(weak)).toContain("Practice");
  });

  it("explains unverified nodes in verdict copy", () => {
    expect(buildMasteryNodeDetailVerdict(node({ state: "none" }))).toMatch(
      /No verified first answer/i,
    );
  });
});

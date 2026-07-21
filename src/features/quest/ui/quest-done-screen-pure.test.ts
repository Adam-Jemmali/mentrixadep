import { describe, expect, it } from "vitest";
import {
  buildApBandFromGrid,
  buildQuestDoneHeroLabel,
  buildQuestDonePrimaryAction,
  apBandImproved,
} from "@/features/quest/ui/quest-done-screen-pure";
import { CALC_READINESS_LABEL } from "@/features/student-home/ap-readiness-band-pure";
import type { MasteryGridData, QuestMasteryHighlight } from "@/features/mastery-grid/types";

const HIGHLIGHT: QuestMasteryHighlight = {
  nodeId: "node-1",
  nodeName: "Chain Rule",
  fromState: "weak",
  toState: "proficient",
  unchanged: false,
  verdictLine: "Chain Rule turned solid green.",
};

describe("buildQuestDoneHeroLabel", () => {
  it("describes a state move in plain language", () => {
    expect(buildQuestDoneHeroLabel(HIGHLIGHT)).toBe(
      "Chain Rule moved from practiced to proficient",
    );
  });

  it("describes a steady node", () => {
    expect(
      buildQuestDoneHeroLabel({ ...HIGHLIGHT, unchanged: true }),
    ).toBe("Chain Rule held steady. One more");
  });
});

describe("buildQuestDonePrimaryAction", () => {
  it("prefers share when verified nodes increased", () => {
    const action = buildQuestDonePrimaryAction({
      highlight: HIGHLIGHT,
      newVerifiedSkills: 1,
      shareHref: "/student/progress",
    });
    expect(action.kind).toBe("share");
    expect(action.label).toContain("Share your progress");
  });

  it("routes to guide browse when node improved but not verified", () => {
    const action = buildQuestDonePrimaryAction({
      highlight: HIGHLIGHT,
      newVerifiedSkills: 0,
      shareHref: "/student/progress",
    });
    expect(action.kind).toBe("guide");
    expect(action.href).toContain("browse-guides");
  });

  it("offers practice again when nothing changed", () => {
    const action = buildQuestDonePrimaryAction({
      highlight: { ...HIGHLIGHT, unchanged: true },
      newVerifiedSkills: 0,
      shareHref: "/student/progress",
    });
    expect(action.kind).toBe("practice");
    expect(action.href).toContain("Chain%20Rule");
  });
});

describe("ap band helpers", () => {
  const grid: MasteryGridData = {
    subject: "AP Calculus AB",
    units: [],
    nextActionLine: "",
    globalRank: {
      verifiedCount: 24,
      accuracyPercent: 82,
      topPercent: 5,
    },
  };

  it("builds after band from grid rank", () => {
    const band = buildApBandFromGrid(grid);
    expect(band.score).toBe(4);
  });

  it("detects improvement when score rises", () => {
    expect(
      apBandImproved(
        { score: 3, label: CALC_READINESS_LABEL, sublabel: "", isVerifiedPrediction: true },
        { score: 4, label: CALC_READINESS_LABEL, sublabel: "", isVerifiedPrediction: true },
      ),
    ).toBe(true);
  });
});

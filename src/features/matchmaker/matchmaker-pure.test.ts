import { describe, expect, it } from "vitest";
import {
  computeGuideMatchScore,
  formatMatchedSkillsLine,
  rankMatchmakerGuides,
} from "@/features/matchmaker/matchmaker-pure";

describe("matchmaker scoring", () => {
  it("adds one point per matched weak node plus impact tiebreaker", () => {
    const result = computeGuideMatchScore(
      ["a", "b", "c"],
      new Set(["a", "c"]),
      82
    );
    expect(result.matchedNodeIds).toEqual(["a", "c"]);
    expect(result.matchScore).toBeCloseTo(2.82);
  });

  it("formats matched skills line for singular and plural", () => {
    expect(formatMatchedSkillsLine(1)).toBe(
      "Matched on your 1 weakest AP Calculus AB skill"
    );
    expect(formatMatchedSkillsLine(2)).toBe(
      "Matched on your 2 weakest AP Calculus AB skills"
    );
    expect(formatMatchedSkillsLine(0)).toBeNull();
  });

  it("returns top guides by match score", () => {
    const ranked = rankMatchmakerGuides(
      [
        {
          guideId: "1",
          displayName: "A",
          avatarUrl: null,
          impactScore: 90,
          matchScore: 1.9,
          matchedNodeNames: ["Chain Rule"],
          nextAvailableSlot: null,
        },
        {
          guideId: "2",
          displayName: "B",
          avatarUrl: null,
          impactScore: 75,
          matchScore: 2.75,
          matchedNodeNames: ["Chain Rule", "Related Rates"],
          nextAvailableSlot: "2026-06-20T12:00:00.000Z",
        },
      ],
      1
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.guideId).toBe("2");
  });
});

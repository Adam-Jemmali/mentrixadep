import { describe, expect, it } from "vitest";
import {
  mapReceiptToPreSessionBrief,
  mergeLastAttemptAt,
  pickSuggestedStartingNode,
} from "@/features/pre-session-brief/build-brief-pure";

describe("deterministic pre-session brief", () => {
  const gaps = [
    {
      skillNodeId: "weak-1",
      nodeName: "Chain Rule",
      accuracy: 42,
      lastAttemptAt: null,
    },
    {
      skillNodeId: "weak-2",
      nodeName: "Product Rule",
      accuracy: 55,
      lastAttemptAt: null,
    },
  ];

  const strengths = [
    { skillNodeId: "strong-1", nodeName: "Limits", impactScore: 91 },
    { skillNodeId: "weak-1", nodeName: "Chain Rule", impactScore: 84 },
  ];

  it("picks overlap between weakest student nodes and guide impact nodes", () => {
    expect(pickSuggestedStartingNode(gaps, strengths)).toEqual({
      nodeId: "weak-1",
      nodeName: "Chain Rule",
    });
  });

  it("falls back to the weakest verified gap when there is no overlap", () => {
    expect(
      pickSuggestedStartingNode(gaps, [{ skillNodeId: "other", nodeName: "U-Substitution", impactScore: 90 }]),
    ).toEqual({
      nodeId: "weak-1",
      nodeName: "Chain Rule",
    });
  });

  it("merges latest practice attempt timestamps onto gaps", () => {
    const merged = mergeLastAttemptAt(gaps, [
      { skill_node_id: "weak-1", last_attempt_at: "2026-06-01T12:00:00.000Z" },
    ]);
    expect(merged[0]?.lastAttemptAt).toBe("2026-06-01T12:00:00.000Z");
  });

  it("maps receipt fields into the stored brief shape without AI prose", () => {
    const brief = mapReceiptToPreSessionBrief({
      verifiedGaps: gaps,
      guideStrengths: strengths,
      suggestedStartingNode: "Chain Rule",
      suggestedStartingNodeId: "weak-1",
      warmupItems: [
        { id: "i1", prompt: "Warm-up one", explanation: "Because product rule." },
        { id: "i2", prompt: "Warm-up two", explanation: "Because chain rule." },
      ],
    });

    expect(brief.likelyCoverage[0]).toContain("Chain Rule");
    expect(brief.weakSpotsToWatch[0]).toContain("42%");
    expect(brief.warmUpExercise.prompt).toBe("Warm-up one");
    expect(brief.warmUpExercise.hint).toBe("Warm-up two");
    expect(brief.questionsToAsk).toHaveLength(3);
  });
});

import { describe, expect, it } from "vitest";
import {
  detectStudioCallSignals,
  primaryStudioCallSignal,
  studioPersonalizationDirective,
  collectStudioPackageTopicCandidates,
} from "@/features/studio-ai/studio-personalization-pure";
import {
  resolveStudioCallCoveredNodeIds,
  resolveStudioMasteryPanelMode,
} from "@/features/studio-ai/studio-mastery-match-pure";

const nodes = [
  { id: "n1", node_name: "Power Rule for Integration", node_slug: "power-rule-integration" },
  { id: "n2", node_name: "Chain Rule", node_slug: "chain-rule" },
  { id: "n3", node_name: "Limits at Infinity", node_slug: "limits-at-infinity" },
];

describe("studio call signal edge cases", () => {
  it("prefers transcript when present", () => {
    const signals = detectStudioCallSignals({
      contextBlocks: ["Recording-derived transcript excerpt (tutor session): We covered +C."],
      guideNotes: "also notes",
    });
    expect(primaryStudioCallSignal(signals)).toBe("transcript");
  });

  it("uses chat when no one spoke but they typed", () => {
    const signals = detectStudioCallSignals({
      contextBlocks: [
        "In-call chat between Guide A and Mentrixer B (chronological):\n- B: what is +C?",
      ],
    });
    expect(primaryStudioCallSignal(signals)).toBe("chat");
    expect(studioPersonalizationDirective({ learnerName: "B", guideName: "A", signals })).toMatch(
      /chat/i,
    );
  });

  it("uses screen share when silent and no chat", () => {
    const signals = detectStudioCallSignals({
      contextBlocks: ["Screen-sharing timeline markers (tutor POV): start@2026-01-01"],
    });
    expect(primaryStudioCallSignal(signals)).toBe("screen_share");
  });

  it("uses whiteboard next", () => {
    const signals = detectStudioCallSignals({
      contextBlocks: ["Whiteboard activity: draw_events=12, clear_events=1, tools={pen:12}."],
    });
    expect(primaryStudioCallSignal(signals)).toBe("whiteboard");
  });

  it("falls back to guide notes then prior then course only", () => {
    expect(
      primaryStudioCallSignal(
        detectStudioCallSignals({ contextBlocks: [], guideNotes: "Stuck on +C" }),
      ),
    ).toBe("guide_notes");
    expect(
      primaryStudioCallSignal(
        detectStudioCallSignals({
          contextBlocks: ["Earlier sessions with this learner (same tutor), for continuity:"],
        }),
      ),
    ).toBe("prior_sessions");
    expect(primaryStudioCallSignal(detectStudioCallSignals({ contextBlocks: [] }))).toBe(
      "course_only",
    );
  });
});

describe("studio mastery call coverage", () => {
  it("pins nodes from package text not weakest seeds", () => {
    const ids = resolveStudioCallCoveredNodeIds(
      {
        summary: "Trapdime practiced the Power Rule for Integration with +C.",
        followUpTopics: ["Chain Rule"],
        keyPoints: ["Limits at Infinity came up briefly"],
      },
      nodes,
    );
    expect(ids).toEqual(expect.arrayContaining(["n1", "n2", "n3"]));
    expect(ids).toHaveLength(3);
  });

  it("returns empty when package has no matching skill nodes", () => {
    const ids = resolveStudioCallCoveredNodeIds(
      {
        summary: "We talked about study habits and exam timing only.",
        followUpTopics: ["Time management"],
      },
      nodes,
    );
    expect(ids).toEqual([]);
    expect(
      resolveStudioMasteryPanelMode({
        isApCalc: true,
        coveredNodeIds: ids,
        hasMasteryGrid: true,
      }),
    ).toBe("full_grid");
  });

  it("collects topic candidates from all package fields", () => {
    const topics = collectStudioPackageTopicCandidates({
      summary: "A",
      keyPoints: ["B"],
      followUpTopics: ["C"],
      practiceTitles: ["D"],
      flashcardQuestions: ["E"],
      practicePrompts: ["F"],
    });
    expect(topics).toEqual(["A", "B", "C", "D", "E", "F"]);
  });
});

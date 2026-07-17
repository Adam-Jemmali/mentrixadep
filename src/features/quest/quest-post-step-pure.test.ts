import { describe, expect, it } from "vitest";
import {
  applyQuestPostPackStepToVerdict,
  buildQuestPostPackChoices,
  buildQuestPostPackCtas,
  buildQuestPostPackStep,
  parseQuestPromptParam,
  pickPostPackFocusNode,
  shortenPostPackCtaLabel,
  SOLID_PRACTICE_PERCENT,
} from "@/features/quest/quest-post-step-pure";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import { defaultMasteryNodeStats } from "@/features/mastery-grid/mastery-grid-pure";

function gridWith(
  nodes: Array<{
    id: string;
    nodeName: string;
    state: "none" | "weak" | "proficient" | "verified";
    accuracyPercent?: number | null;
    displayOrder?: number;
  }>,
): MasteryGridData {
  return {
    subject: "AP Calculus AB",
    units: [
      {
        unitNumber: 1,
        unitName: "Limits",
        nodes: nodes.map((node, index) => ({
          id: node.id,
          nodeName: node.nodeName,
          nodeSlug: node.nodeName.toLowerCase().replace(/\s+/g, "-"),
          displayOrder: node.displayOrder ?? index + 1,
          ...defaultMasteryNodeStats(),
          state: node.state,
          accuracyPercent: node.accuracyPercent ?? null,
        })),
      },
    ],
    nextActionLine: "",
  };
}

describe("quest-post-step-pure", () => {
  it("asks to practice until green when node is weak in practice", () => {
    const step = buildQuestPostPackStep({
      id: "a",
      nodeName: "Chain Rule",
      nodeSlug: "chain-rule",
      displayOrder: 1,
      ...defaultMasteryNodeStats(),
      state: "weak",
      accuracyPercent: 55,
      practiceAttempts: 4,
      practiceCorrect: 2,
    });
    expect(step.phase).toBe("practice_to_green");
    expect(step.nextAction.label).toContain("until green");
    expect(step.nextAction.label).toContain(String(SOLID_PRACTICE_PERCENT));
  });

  it("routes green nodes to a verified quest attempt", () => {
    const step = buildQuestPostPackStep({
      id: "b",
      nodeName: "Limits",
      nodeSlug: "limits",
      displayOrder: 1,
      ...defaultMasteryNodeStats(),
      state: "proficient",
      accuracyPercent: 78,
      practiceAttempts: 6,
      practiceCorrect: 5,
    });
    expect(step.phase).toBe("quest_to_verify");
    expect(step.nextAction.label).toContain("Quest Limits");
  });

  it("overrides generic practice verdict with grid-aware next step", () => {
    const data = gridWith([
      { id: "a", nodeName: "Chain Rule", state: "weak", accuracyPercent: 40 },
      { id: "b", nodeName: "Limits", state: "verified", accuracyPercent: 100 },
    ]);
    const focus = pickPostPackFocusNode(data, ["a", "b"]);
    expect(focus?.nodeName).toBe("Chain Rule");

    const enriched = applyQuestPostPackStepToVerdict(
      {
        changed: "Chain Rule moved -10 points this session.",
        reason: "Miss pattern.",
        nextAction: { label: "Practice Chain Rule", href: "/student/quest" },
      },
      data,
      ["a", "b"],
    );
    expect(enriched.nextAction.label).toContain("until green");
    expect(enriched.comparison).toContain("weekly receipt");
  });

  it("keeps retest verdicts untouched", () => {
    const data = gridWith([{ id: "a", nodeName: "Chain Rule", state: "weak", accuracyPercent: 0 }]);
    const enriched = applyQuestPostPackStepToVerdict(
      {
        changed: "Retest due.",
        reason: "",
        nextAction: { label: "Retest Chain Rule now", href: "/student/quest" },
      },
      data,
      ["a"],
    );
    expect(enriched.nextAction.label).toContain("Retest");
  });

  it("parses quest prompt params into node names", () => {
    expect(parseQuestPromptParam("Practice Chain Rule")).toBe("Chain Rule");
    expect(parseQuestPromptParam("Quest Limits")).toBe("Limits");
  });

  it("offers same-topic and different-topic choices after a pack", () => {
    const data = gridWith([
      { id: "a", nodeName: "Chain Rule", state: "weak", accuracyPercent: 55, displayOrder: 1 },
      { id: "b", nodeName: "Related Rates", state: "none", displayOrder: 2 },
    ]);
    const choices = buildQuestPostPackChoices(data, ["a"]);
    expect(choices?.sameTopic.nodeName).toBe("Chain Rule");
    expect(choices?.otherTopic?.nodeName).toBe("Related Rates");
    expect(choices?.sameTopic.href).toContain("Chain%20Rule");
    expect(choices?.otherTopic?.href).toContain("Related%20Rates");
  });

  it("shortens CTA labels for buttons", () => {
    expect(shortenPostPackCtaLabel("Practice Chain Rule until green (70%+)")).toBe(
      "Practice Chain Rule",
    );
    expect(shortenPostPackCtaLabel("Quest Limits to lock rank")).toBe("Quest Limits");
  });

  it("builds at most three post-pack CTAs with a clear primary", () => {
    const data = gridWith([
      { id: "a", nodeName: "u substitution basics", state: "verified", accuracyPercent: 100 },
      { id: "b", nodeName: "Introducing limits", state: "none", displayOrder: 2 },
    ]);
    const verdict = applyQuestPostPackStepToVerdict(
      {
        changed: "Done.",
        reason: "",
        nextAction: { label: "Practice something", href: "/student/quest" },
      },
      data,
      ["a"],
    );
    const ctas = buildQuestPostPackCtas({
      verdict,
      grid: data,
      packNodeIds: ["a"],
    });
    expect(ctas).toHaveLength(3);
    expect(ctas[0]?.kind).toBe("primary");
    expect(ctas[0]?.key).toBe("next");
    expect(ctas.map((c) => c.key)).toContain("home");
    expect(ctas.every((c) => c.label.length > 0)).toBe(true);
  });
});

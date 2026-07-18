import { describe, expect, it } from "vitest";
import {
  gradeClozeAccuracy,
  gradeDragOrder,
  gradeGraphFeatureSelections,
  parseClozeBlanks,
  preferConstructionMix,
  shufflePreservingCopy,
} from "@/features/quest/quest-interaction-formats-pure";
import { validateStemQualityForApprove } from "@/features/quest/quest-authoring-doctrine-pure";
import {
  buildVerifiedAttemptCard,
  summarizeConstructionMix,
} from "@/features/quest/verified-attempt-card-pure";

describe("quest-interaction-formats-pure", () => {
  it("parses cloze blanks and grades weighted accuracy", () => {
    const blanks = parseClozeBlanks([
      { key: "a", expression: "6*x" },
      { key: "b", answer_expression: "12", weight: 2 },
    ]);
    expect(blanks).toHaveLength(2);
    expect(gradeClozeAccuracy(blanks, { a: true, b: false })).toBeCloseTo(1 / 3);
    expect(gradeClozeAccuracy(blanks, { a: true, b: true })).toBe(1);
  });

  it("grades drag order with Kendall agreement", () => {
    const correct = ["A", "B", "C"];
    expect(gradeDragOrder(correct, ["A", "B", "C"]).correct).toBe(true);
    const partial = gradeDragOrder(correct, ["A", "C", "B"]);
    expect(partial.correct).toBe(false);
    expect(partial.accuracyPct).toBeGreaterThan(0);
  });

  it("grades graph feature hit tests", () => {
    const graded = gradeGraphFeatureSelections(
      [{ kind: "point", x: 1, tolerance: 0.35 }],
      [{ kind: "point", x: 1.1 }],
    );
    expect(graded.correct).toBe(true);
  });

  it("shuffles without identity for short lists", () => {
    const shuffled = shufflePreservingCopy(["a", "b"]);
    expect(shuffled).toHaveLength(2);
    expect(new Set(shuffled)).toEqual(new Set(["a", "b"]));
  });

  it("prefers construction mix until share is met", () => {
    const pool = [
      { id: "1", item_format: "mcq" },
      { id: "2", item_format: "free_response" },
    ];
    const ordered = preferConstructionMix(pool, 0, 0);
    expect(ordered[0]?.item_format).toBe("free_response");
  });
});

describe("quest-authoring-doctrine-pure", () => {
  it("requires function graphs when f(x) appears", () => {
    const reasons = validateStemQualityForApprove({
      prompt: "If f(x) = x^2 + 1, what is f'(x)?",
      itemFormat: "free_response",
      stimulus: [],
    });
    expect(reasons.some((r) => /function_graph/i.test(r))).toBe(true);
  });
});

describe("verified-attempt-card-pure", () => {
  it("builds a resume-grade card with verdict", () => {
    const card = buildVerifiedAttemptCard({
      skillNodeId: "00000000-0000-0000-0000-000000000001",
      nodeName: "Power rule",
      unitName: "Derivatives",
      unitNumber: 2,
      attemptFormat: "free_response",
      isCorrect: true,
      accuracyPct: 1,
      attemptedAt: "2026-07-18T00:00:00.000Z",
    });
    expect(card.modalityLabel).toMatch(/Constructed/i);
    expect(card.verdict).toMatch(/permanent proof/i);
  });

  it("summarizes construction mix", () => {
    const mix = summarizeConstructionMix([
      { attemptFormat: "mcq" },
      { attemptFormat: "free_response" },
      { attemptFormat: "drag_order" },
    ]);
    expect(mix.constructionShare).toBeCloseTo(2 / 3);
  });
});

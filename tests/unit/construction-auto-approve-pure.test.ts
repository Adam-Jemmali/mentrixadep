import { describe, expect, it } from "vitest";
import {
  validateConstructionGroundTruth,
  shouldAttemptConstructionAutoApprove,
} from "@/features/quest/construction-auto-approve-pure";
import {
  gradeGraphSketchAgainstEvaluator,
  gradeGraphSketchControlPolyline,
} from "@/features/quest/quest-interaction-formats-pure";
import { buildConstructionTemplatesForNode } from "../../scripts/lib/construction-item-templates-pure";

describe("validateConstructionGroundTruth", () => {
  it("rejects MCQ as non-construction", () => {
    const result = validateConstructionGroundTruth({
      itemFormat: "mcq",
      prompt: "What is the derivative of x^2?",
      options: ["2x", "x", "2", "x^2"],
      correctAnswer: "2x",
      answerExpression: null,
      solutionSteps: null,
      stimulus: null,
      authoringMeta: null,
      explanation: "Power rule.",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts free_response with parseable answer_expression", () => {
    const result = validateConstructionGroundTruth({
      itemFormat: "free_response",
      prompt: "Construct the derivative of f(x) = x^3 - 2x for this skill node.",
      options: null,
      correctAnswer: "3*x^2 - 2",
      answerExpression: "3*x^2 - 2",
      solutionSteps: [],
      stimulus: null,
      authoringMeta: null,
      explanation: "Power rule term by term.",
    });
    expect(result).toEqual({ ok: true });
  });

  it("accepts sketch-only graph_feature with answer_expression", () => {
    const result = validateConstructionGroundTruth({
      itemFormat: "graph_feature",
      prompt: "Sketch y = x^2 - 1 on the provided axes by placing control points carefully.",
      options: null,
      correctAnswer: "x^2 - 1",
      answerExpression: "x^2 - 1",
      solutionSteps: [],
      stimulus: [
        {
          kind: "function_graph",
          title: "Sketch",
          alt: "Axes",
          domain: [-2, 2],
          range: [-2, 4],
          curves: [],
          sketch: true,
        },
      ],
      authoringMeta: null,
      explanation: "Polyline is scored against the authored parabola.",
    });
    expect(result).toEqual({ ok: true });
  });

  it("rejects graph_feature with empty axes and no sketch truth", () => {
    const result = validateConstructionGroundTruth({
      itemFormat: "graph_feature",
      prompt: "Mark something interesting on this empty graph for the skill.",
      options: null,
      correctAnswer: "?",
      answerExpression: null,
      solutionSteps: [],
      stimulus: [
        {
          kind: "function_graph",
          title: "Empty",
          alt: "Empty",
          domain: [-2, 2],
          curves: [],
          sketch: true,
        },
      ],
      authoringMeta: null,
      explanation: "No truth.",
    });
    expect(result.ok).toBe(false);
  });

  it("every offline template passes auto-approve gates", () => {
    const templates = buildConstructionTemplatesForNode("Derivatives", 2);
    expect(templates.length).toBeGreaterThanOrEqual(4);
    for (const t of templates) {
      expect(shouldAttemptConstructionAutoApprove(t.item_format)).toBe(true);
      const gate = validateConstructionGroundTruth({
        itemFormat: t.item_format,
        prompt: t.prompt,
        options: t.options,
        correctAnswer: t.correct_answer,
        answerExpression: t.answer_expression,
        solutionSteps: t.solution_steps,
        stimulus: t.stimulus,
        authoringMeta: t.authoring_meta,
        explanation: t.explanation,
      });
      expect(gate, JSON.stringify(gate)).toEqual({ ok: true });
    }
  });

  it("varies template keys and answers across units and nodes", () => {
    const limits = buildConstructionTemplatesForNode("One sided limits", 1);
    const integrals = buildConstructionTemplatesForNode("Basic integration rules", 6);
    const derivA = buildConstructionTemplatesForNode("Product rule", 2);
    const derivB = buildConstructionTemplatesForNode("Chain rule", 2);
    const keysA = new Set(limits.map((t) => t.authoring_meta.template_key));
    const keysB = new Set(integrals.map((t) => t.authoring_meta.template_key));
    const overlap = [...keysA].filter((k) => keysB.has(k));
    expect(overlap.length).toBeLessThan(keysA.size);
    expect(limits[0]?.answer_expression).not.toBe(integrals[0]?.answer_expression);
    const answersA = new Set(derivA.map((t) => t.answer_expression).filter(Boolean));
    const answersB = new Set(derivB.map((t) => t.answer_expression).filter(Boolean));
    const sharedAnswers = [...answersA].filter((a) => answersB.has(a));
    expect(sharedAnswers.length).toBeLessThan(Math.min(answersA.size, answersB.size));
    expect(derivA.length).toBeGreaterThanOrEqual(8);
  });

  it("does not stamp every derivatives node with the same generic UV drag", () => {
    const a = buildConstructionTemplatesForNode("Power rule", 2);
    const b = buildConstructionTemplatesForNode("Quotient rule", 3);
    const dragA = a.filter((t) => t.item_format === "drag_order").map((t) => t.prompt);
    const dragB = b.filter((t) => t.item_format === "drag_order").map((t) => t.prompt);
    expect(dragA.some((p) => /product \$uv\$/i.test(p))).toBe(false);
    expect(dragA.join("\n")).not.toBe(dragB.join("\n"));
  });
});

describe("gradeGraphSketchAgainstEvaluator", () => {
  it("passes control polyline near y = x^2", () => {
    const controls = [
      { x: -2, y: 4 },
      { x: -1, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ];
    const graded = gradeGraphSketchControlPolyline(controls, [-2, 2], (x) => x * x, {
      passFraction: 0.7,
    });
    expect(graded.correct).toBe(true);
    expect(graded.accuracyPct).toBeGreaterThanOrEqual(0.7);
  });

  it("fails a bad sketch of the same curve", () => {
    const samples = [
      { x: -2, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const graded = gradeGraphSketchAgainstEvaluator(samples, (x) => x * x);
    expect(graded.correct).toBe(false);
  });
});

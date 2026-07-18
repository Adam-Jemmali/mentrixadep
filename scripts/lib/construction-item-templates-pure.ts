/**
 * Deterministic construction templates — no Gemini.
 * Each item ships with machine-gradeable ground truth so grading never needs an admin.
 */

export type ConstructionTemplateRow = {
  item_format: "free_response" | "complete_expression" | "drag_order" | "graph_feature";
  prompt: string;
  options: string[] | null;
  correct_answer: string;
  answer_expression: string | null;
  explanation: string;
  solution_steps: unknown;
  stimulus: unknown;
  authoring_meta: {
    skill_verb: string;
    transfer_tag: string;
    proof_artifact: string;
    misconception_kit: readonly string[];
  };
  difficulty_rating: number;
};

const DOCTRINE = {
  skill_verb: "construct",
  transfer_tag: "AP Calculus AB verified construction",
  proof_artifact: "First-attempt machine-graded construction under VFA.",
  misconception_kit: ["forgot_chain_rule", "dropped_constant", "power_rule_off_by_one"],
} as const;

/** Built for any skill node — answers are fixed expressions/orderings, not node-specific Gemini. */
export function buildConstructionTemplatesForNode(nodeName: string): ConstructionTemplateRow[] {
  const safeName = nodeName.trim() || "this skill";
  return [
    {
      item_format: "free_response",
      prompt: `For ${safeName}: if f(x) = x^3 - 2x, construct f'(x) as a simplified expression.`,
      options: null,
      correct_answer: "3*x^2 - 2",
      answer_expression: "3*x^2 - 2",
      explanation:
        "Differentiate term-by-term with the power rule. Mentrixa grades symbolic equivalence, not handwriting.",
      solution_steps: [
        {
          step_number: 1,
          description: "Differentiate x^3",
          expression: "3*x^2",
          misconception_if_skipped: "forgot_coefficient",
          is_critical: true,
        },
        {
          step_number: 2,
          description: "Differentiate -2x",
          expression: "3*x^2 - 2",
          misconception_if_skipped: "dropped_constant",
          is_critical: true,
        },
      ],
      stimulus: [
        {
          kind: "function_graph",
          title: "Function graph",
          alt: "Graph of f(x) = x^3 - 2x",
          domain: [-2, 2],
          curves: [{ expression: "x^3 - 2*x", color: "#2D70B3", label: "f(x)" }],
        },
      ],
      authoring_meta: { ...DOCTRINE, skill_verb: "compute" },
      difficulty_rating: 1000,
    },
    {
      item_format: "complete_expression",
      prompt: `For ${safeName}: complete f'(x) = {{a}} when f(x) = 4x^2 + 5.`,
      options: null,
      correct_answer: "8*x",
      answer_expression: "8*x",
      explanation: "Power rule on 4x^2 yields 8x. The constant vanishes.",
      solution_steps: [{ key: "a", expression: "8*x", weight: 1 }],
      stimulus: [
        {
          kind: "function_graph",
          title: "Function graph",
          alt: "Graph of f(x) = 4x^2 + 5",
          domain: [-2, 2],
          curves: [{ expression: "4*x^2 + 5", color: "#2D70B3", label: "f(x)" }],
        },
      ],
      authoring_meta: { ...DOCTRINE },
      difficulty_rating: 900,
    },
    {
      item_format: "drag_order",
      prompt: `For ${safeName}: order the steps to differentiate a product uv.`,
      options: [
        "Identify u and v",
        "Compute u' and v'",
        "Apply u'v + uv'",
        "Simplify the expression",
      ],
      correct_answer: "Identify u and v",
      answer_expression: null,
      explanation: "Product rule construction order is fixed; Mentrixa grades the permutation.",
      solution_steps: [],
      stimulus: null,
      authoring_meta: { ...DOCTRINE, skill_verb: "justify" },
      difficulty_rating: 950,
    },
    {
      item_format: "graph_feature",
      prompt: `For ${safeName}: sketch y = x^2 - 1 by placing control points that follow the verified parabola.`,
      options: null,
      correct_answer: "x^2 - 1",
      answer_expression: "x^2 - 1",
      explanation:
        "Your polyline is sampled against y = x^2 - 1. Close enough is scored automatically; admins never grade the sketch.",
      solution_steps: [],
      stimulus: [
        {
          kind: "function_graph",
          title: "Sketch grid",
          alt: "Empty axes for sketching x^2 - 1",
          domain: [-2, 2],
          range: [-2, 4],
          curves: [],
          sketch: true,
        },
      ],
      authoring_meta: { ...DOCTRINE, skill_verb: "construct" },
      difficulty_rating: 1050,
    },
    {
      item_format: "graph_feature",
      prompt: `For ${safeName}: on f(x) = x^3 - 3x, mark the critical points near x = -1 and x = 1.`,
      options: null,
      correct_answer: "critical points",
      answer_expression: null,
      explanation: "f'(x) = 3x^2 - 3 = 0 at x = ±1. Feature hits are graded by tolerance.",
      solution_steps: [
        { kind: "point", x: -1, tolerance: 0.35, label: "local max/min" },
        { kind: "point", x: 1, tolerance: 0.35, label: "local max/min" },
      ],
      stimulus: [
        {
          kind: "function_graph",
          title: "Function graph",
          alt: "Graph of x^3 - 3x",
          domain: [-2.5, 2.5],
          curves: [{ expression: "x^3 - 3*x", color: "#2D70B3", label: "f(x)" }],
        },
      ],
      authoring_meta: { ...DOCTRINE, skill_verb: "interpret" },
      difficulty_rating: 1100,
    },
  ];
}

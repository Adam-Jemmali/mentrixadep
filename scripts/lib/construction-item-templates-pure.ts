/**
 * Deterministic construction templates — no Gemini.
 * Each item is a recruiter-readable skill proof: construct, justify, interpret under VFA.
 * Answers are fixed expressions/orderings so grading never needs an admin.
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
  transfer_tag: "AP Calculus AB verified first-attempt skill proof",
  proof_artifact:
    "Machine-graded construction under Verified First Attempt — permanent recruiter-readable evidence.",
  misconception_kit: ["forgot_chain_rule", "dropped_constant", "power_rule_off_by_one"],
} as const;

/** Built for any skill node — applied constructions recruiters can trust as real skill. */
export function buildConstructionTemplatesForNode(nodeName: string): ConstructionTemplateRow[] {
  const safeName = nodeName.trim() || "this skill";
  return [
    {
      item_format: "free_response",
      prompt: `Applied rate proof for ${safeName}: a position model is $s(t) = t^{3} - 2t$. Construct the velocity $v(t) = s'(t)$ as a simplified expression. This is the same derivative skill used to quantify change in analytics and engineering models.`,
      options: null,
      correct_answer: "3*t^2 - 2",
      answer_expression: "3*t^2 - 2",
      explanation:
        "Differentiate term-by-term. Mentrixa grades symbolic equivalence. First-attempt result is permanent proof of the skill.",
      solution_steps: [
        {
          step_number: 1,
          description: "Differentiate t^3",
          expression: "3*t^2",
          misconception_if_skipped: "forgot_coefficient",
          is_critical: true,
        },
        {
          step_number: 2,
          description: "Differentiate -2t",
          expression: "3*t^2 - 2",
          misconception_if_skipped: "dropped_constant",
          is_critical: true,
        },
      ],
      stimulus: [
        {
          kind: "function_graph",
          title: "Position model s(t)",
          alt: "Graph of s(t) = t^3 - 2t",
          domain: [-2, 2],
          curves: [{ expression: "x^3 - 2*x", color: "#2D70B3", label: "s(t)" }],
        },
      ],
      authoring_meta: {
        ...DOCTRINE,
        skill_verb: "compute",
        misconception_kit: ["forgot_coefficient", "dropped_constant", "power_rule_off_by_one"],
      },
      difficulty_rating: 1000,
    },
    {
      item_format: "complete_expression",
      prompt: `Complete the growth-rate construction for ${safeName}: if $P(t) = 4e^{2t}$, then $P'(t) = {{a}}$. Recruiters read this as: can you differentiate exponential models used in growth, decay, and compounding.`,
      options: null,
      correct_answer: "8*e^(2*t)",
      answer_expression: "8*e^(2*t)",
      explanation:
        "Chain rule: derivative of e^{2t} is e^{2t}·2, then multiply by 4 → 8e^{2t}.",
      solution_steps: [{ key: "a", expression: "8*e^(2*t)", weight: 1 }],
      stimulus: [
        {
          kind: "function_graph",
          title: "Exponential growth P(t)",
          alt: "Graph of 4e^(2t) style growth",
          domain: [-1, 1.2],
          curves: [{ expression: "4*exp(2*x)", color: "#2D70B3", label: "P(t)" }],
        },
      ],
      authoring_meta: {
        ...DOCTRINE,
        skill_verb: "construct",
        misconception_kit: ["forgot_chain_rule", "dropped_constant", "exp_coeff_error"],
      },
      difficulty_rating: 1050,
    },
    {
      item_format: "drag_order",
      prompt: `Decision pipeline for ${safeName}: order the steps a strong analyst uses to differentiate a product $uv$ under time pressure. Correct order is verified proof of method, not memorization.`,
      options: [
        "Identify factors u and v from the model",
        "Construct u' and v' with the correct rules",
        "Assemble u'v + uv'",
        "Simplify and state the rate interpretation",
      ],
      correct_answer: "Identify factors u and v from the model",
      answer_expression: null,
      explanation:
        "Product-rule construction order is fixed. Mentrixa grades the permutation as method skill.",
      solution_steps: [],
      stimulus: [
        {
          kind: "function_graph",
          title: "Example product model",
          alt: "Graph of an example product curve",
          domain: [-2, 2],
          curves: [
            { expression: "x^2", color: "#2D70B3", label: "u" },
            { expression: "sin(x)", color: "#6366F1", label: "v" },
          ],
        },
      ],
      authoring_meta: {
        ...DOCTRINE,
        skill_verb: "justify",
        misconception_kit: ["wrong_product_order", "skip_identify", "forget_simplify"],
      },
      difficulty_rating: 950,
    },
    {
      item_format: "graph_feature",
      prompt: `Signal reconstruction for ${safeName}: sketch $y = \\sin(x)$ on $[-\\pi, \\pi]$ by placing control points that follow the verified sine wave. This proves you can recover a periodic signal shape, not just pick a multiple-choice graph.`,
      options: null,
      correct_answer: "sin(x)",
      answer_expression: "sin(x)",
      explanation:
        "Your polyline is sampled against y = sin(x). Close enough is scored automatically.",
      solution_steps: [],
      stimulus: [
        {
          kind: "function_graph",
          title: "Sketch grid",
          alt: "Empty axes for sketching sin(x)",
          domain: [-3.2, 3.2],
          range: [-1.5, 1.5],
          curves: [],
          sketch: true,
        },
      ],
      authoring_meta: {
        ...DOCTRINE,
        skill_verb: "construct",
        misconception_kit: ["phase_shift_error", "amplitude_error", "wrong_period"],
      },
      difficulty_rating: 1080,
    },
    {
      item_format: "graph_feature",
      prompt: `Optimization decision for ${safeName}: on $f(x) = x^{3} - 3x$, mark the critical points near $x = -1$ and $x = 1$. Those points are where a decision model changes from increase to decrease — the same skill used in constrained optimization.`,
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
          title: "Decision surface f(x)",
          alt: "Graph of x^3 - 3x",
          domain: [-2.5, 2.5],
          curves: [{ expression: "x^3 - 3*x", color: "#2D70B3", label: "f(x)" }],
        },
      ],
      authoring_meta: {
        ...DOCTRINE,
        skill_verb: "interpret",
        misconception_kit: ["miss_critical_point", "endpoint_confusion", "sign_chart_error"],
      },
      difficulty_rating: 1100,
    },
    {
      item_format: "free_response",
      prompt: `Trigonometric rate for ${safeName}: if $\\theta(t)$ satisfies a model with $h(t) = \\cos(2t)$, construct $h'(t)$. This is chain-rule skill applied to oscillatory systems.`,
      options: null,
      correct_answer: "-2*sin(2*t)",
      answer_expression: "-2*sin(2*t)",
      explanation: "d/dt[cos(2t)] = -sin(2t)·2 = -2sin(2t).",
      solution_steps: [
        {
          step_number: 1,
          description: "Outer cosine derivative",
          expression: "-sin(2*t)",
          misconception_if_skipped: "forgot_chain_rule",
          is_critical: true,
        },
        {
          step_number: 2,
          description: "Multiply by inner 2",
          expression: "-2*sin(2*t)",
          misconception_if_skipped: "forgot_chain_rule",
          is_critical: true,
        },
      ],
      stimulus: [
        {
          kind: "function_graph",
          title: "Oscillatory signal",
          alt: "Graph of cos(2t)",
          domain: [-3.2, 3.2],
          curves: [{ expression: "cos(2*x)", color: "#2D70B3", label: "h(t)" }],
        },
      ],
      authoring_meta: {
        ...DOCTRINE,
        skill_verb: "compute",
        misconception_kit: ["forgot_chain_rule", "sign_error", "trig_derivative_swap"],
      },
      difficulty_rating: 1120,
    },
  ];
}

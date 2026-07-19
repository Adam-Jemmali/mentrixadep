/**
 * Deterministic construction templates — no Gemini.
 * Content varies by unit + node so packs do not feel identical across runs.
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
    template_key: string;
  };
  difficulty_rating: number;
};

const DOCTRINE_BASE = {
  transfer_tag: "AP Calculus AB verified first-attempt skill proof",
  proof_artifact:
    "Machine-graded construction under Verified First Attempt — permanent recruiter-readable evidence.",
} as const;

export function hashNodeKey(nodeName: string): number {
  let h = 2166136261;
  for (let i = 0; i < nodeName.length; i++) {
    h ^= nodeName.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function unitFamily(unitNumber: number | null | undefined): "limits" | "derivatives" | "applications" | "integrals" {
  const u = unitNumber ?? 2;
  if (u <= 1) return "limits";
  if (u <= 3) return "derivatives";
  if (u <= 5) return "applications";
  return "integrals";
}

type FrVariant = {
  key: string;
  promptMath: string;
  answer: string;
  curve: string;
  label: string;
  steps: Array<{ description: string; expression: string; misconception_if_skipped: string }>;
  explanation: string;
  misconception_kit: readonly string[];
};

const FR_BY_FAMILY: Record<string, FrVariant[]> = {
  limits: [
    {
      key: "lim-diff-quot",
      promptMath: "the difference quotient for $f(x) = x^{2} + 1$ collapses to construct $f'(x)$",
      answer: "2*x",
      curve: "x^2 + 1",
      label: "f(x)",
      steps: [
        { description: "Expand f(x+h)", expression: "(x+h)^2+1", misconception_if_skipped: "algebra_expand_error" },
        { description: "Limit as h→0", expression: "2*x", misconception_if_skipped: "limit_drop_h" },
      ],
      explanation: "Difference quotient → 2x. Verified construction of the derivative definition skill.",
      misconception_kit: ["algebra_expand_error", "limit_drop_h", "forgot_coefficient"],
    },
    {
      key: "lim-cubic",
      promptMath: "if $f(x) = x^{3} - x$, construct $f'(x)$ from first principles style power rules",
      answer: "3*x^2 - 1",
      curve: "x^3 - x",
      label: "f(x)",
      steps: [
        { description: "Differentiate x^3", expression: "3*x^2", misconception_if_skipped: "forgot_coefficient" },
        { description: "Differentiate -x", expression: "3*x^2 - 1", misconception_if_skipped: "dropped_constant" },
      ],
      explanation: "Power rule term-by-term yields 3x^2 - 1.",
      misconception_kit: ["forgot_coefficient", "dropped_constant", "power_rule_off_by_one"],
    },
  ],
  derivatives: [
    {
      key: "deriv-poly",
      promptMath: "a position model is $s(t) = t^{3} - 2t$. Construct velocity $v(t) = s'(t)$",
      answer: "3*t^2 - 2",
      curve: "x^3 - 2*x",
      label: "s(t)",
      steps: [
        { description: "Differentiate t^3", expression: "3*t^2", misconception_if_skipped: "forgot_coefficient" },
        { description: "Differentiate -2t", expression: "3*t^2 - 2", misconception_if_skipped: "dropped_constant" },
      ],
      explanation: "Rate of change construction: v(t) = 3t^2 - 2.",
      misconception_kit: ["forgot_coefficient", "dropped_constant", "power_rule_off_by_one"],
    },
    {
      key: "deriv-trig",
      promptMath: "an oscillatory signal is $h(t) = \\cos(2t)$. Construct $h'(t)$",
      answer: "-2*sin(2*t)",
      curve: "cos(2*x)",
      label: "h(t)",
      steps: [
        { description: "Outer cosine", expression: "-sin(2*t)", misconception_if_skipped: "forgot_chain_rule" },
        { description: "Chain factor 2", expression: "-2*sin(2*t)", misconception_if_skipped: "forgot_chain_rule" },
      ],
      explanation: "Chain rule on cos(2t) → -2sin(2t).",
      misconception_kit: ["forgot_chain_rule", "sign_error", "trig_derivative_swap"],
    },
    {
      key: "deriv-exp",
      promptMath: "a growth model is $P(t) = e^{3t}$. Construct $P'(t)$",
      answer: "3*e^(3*t)",
      curve: "exp(3*x)",
      label: "P(t)",
      steps: [
        { description: "Exponential chain rule", expression: "3*e^(3*t)", misconception_if_skipped: "forgot_chain_rule" },
      ],
      explanation: "d/dt e^{3t} = 3e^{3t}.",
      misconception_kit: ["forgot_chain_rule", "exp_coeff_error", "dropped_constant"],
    },
  ],
  applications: [
    {
      key: "app-opt",
      promptMath: "for $f(x) = x^{3} - 3x$, construct $f'(x)$ used to locate critical points",
      answer: "3*x^2 - 3",
      curve: "x^3 - 3*x",
      label: "f(x)",
      steps: [
        { description: "Differentiate", expression: "3*x^2 - 3", misconception_if_skipped: "forgot_coefficient" },
      ],
      explanation: "Optimization starts from f'(x) = 3x^2 - 3.",
      misconception_kit: ["forgot_coefficient", "critical_point_miss", "sign_chart_error"],
    },
    {
      key: "app-related",
      promptMath: "related-rates setup: if $A = \\pi r^{2}$, construct $dA/dr$",
      answer: "2*pi*r",
      curve: "pi*x^2",
      label: "A(r)",
      steps: [
        { description: "Power rule on r^2", expression: "2*pi*r", misconception_if_skipped: "forgot_coefficient" },
      ],
      explanation: "dA/dr = 2πr — the geometric rate link.",
      misconception_kit: ["forgot_coefficient", "pi_drop", "power_rule_off_by_one"],
    },
  ],
  integrals: [
    {
      key: "int-antideriv",
      promptMath: "construct an antiderivative of $f(x) = 3x^{2} - 2$ (omit +C)",
      answer: "x^3 - 2*x",
      curve: "3*x^2 - 2",
      label: "f(x)",
      steps: [
        { description: "Integrate 3x^2", expression: "x^3", misconception_if_skipped: "integral_power_error" },
        { description: "Integrate -2", expression: "x^3 - 2*x", misconception_if_skipped: "dropped_constant" },
      ],
      explanation: "Antiderivative construction: x^3 - 2x.",
      misconception_kit: ["integral_power_error", "dropped_constant", "forgot_plus_c"],
    },
    {
      key: "int-ftc",
      promptMath: "if $F(x) = \\int_{0}^{x} (3t^{2} - 2)\\,dt$, construct $F'(x)$ by FTC",
      answer: "3*x^2 - 2",
      curve: "3*x^2 - 2",
      label: "integrand",
      steps: [
        { description: "FTC", expression: "3*x^2 - 2", misconception_if_skipped: "ftc_miss" },
      ],
      explanation: "FTC: F'(x) equals the integrand at x.",
      misconception_kit: ["ftc_miss", "bound_swap", "forgot_chain_rule"],
    },
  ],
};

type ClozeVariant = {
  key: string;
  prompt: string;
  answer: string;
  curve: string;
  label: string;
};

const CLOZE_BY_FAMILY: Record<string, ClozeVariant[]> = {
  limits: [
    {
      key: "cloze-lim-slope",
      prompt: "Complete: if $f(x) = 5x^{2}$, then $f'(x) = {{a}}$.",
      answer: "10*x",
      curve: "5*x^2",
      label: "f(x)",
    },
    {
      key: "cloze-lim-lin",
      prompt: "Complete: if $f(x) = 7x - 4$, then $f'(x) = {{a}}$.",
      answer: "7",
      curve: "7*x - 4",
      label: "f(x)",
    },
  ],
  derivatives: [
    {
      key: "cloze-exp",
      prompt: "Complete: if $P(t) = 4e^{2t}$, then $P'(t) = {{a}}$.",
      answer: "8*e^(2*t)",
      curve: "4*exp(2*x)",
      label: "P(t)",
    },
    {
      key: "cloze-sin",
      prompt: "Complete: if $g(x) = \\sin(3x)$, then $g'(x) = {{a}}$.",
      answer: "3*cos(3*x)",
      curve: "sin(3*x)",
      label: "g(x)",
    },
  ],
  applications: [
    {
      key: "cloze-ln",
      prompt: "Complete: if $y = \\ln(5x)$, then $y' = {{a}}$.",
      answer: "1/x",
      curve: "log(5*x)",
      label: "y",
    },
    {
      key: "cloze-prod-ready",
      prompt: "Complete: if $f(x) = x^{4}$, then $f'(x) = {{a}}$.",
      answer: "4*x^3",
      curve: "x^4",
      label: "f(x)",
    },
  ],
  integrals: [
    {
      key: "cloze-anti",
      prompt: "Complete an antiderivative: $\\int 6x\\,dx = {{a}}$ (omit +C).",
      answer: "3*x^2",
      curve: "6*x",
      label: "integrand",
    },
    {
      key: "cloze-e",
      prompt: "Complete: $\\int e^{x}\\,dx = {{a}}$ (omit +C).",
      answer: "e^x",
      curve: "exp(x)",
      label: "e^x",
    },
  ],
};

type SketchVariant = {
  key: string;
  prompt: string;
  answer: string;
  domain: [number, number];
  range: [number, number];
};

const SKETCH_BY_FAMILY: Record<string, SketchVariant[]> = {
  limits: [
    {
      key: "sketch-quad",
      prompt: "Sketch $y = x^{2} - 1$ with control points that follow the verified parabola.",
      answer: "x^2 - 1",
      domain: [-2, 2],
      range: [-2, 4],
    },
  ],
  derivatives: [
    {
      key: "sketch-sin",
      prompt: "Sketch $y = \\sin(x)$ on $[-\\pi, \\pi]$ with control points on the verified sine wave.",
      answer: "sin(x)",
      domain: [-3.2, 3.2],
      range: [-1.5, 1.5],
    },
    {
      key: "sketch-abs-like",
      prompt: "Sketch $y = |x|$ style V using $y = \\sqrt{x^{2}}$ samples — place points along $y = \\sqrt{x^{2}}$.",
      answer: "sqrt(x^2)",
      domain: [-2, 2],
      range: [-0.5, 2.5],
    },
  ],
  applications: [
    {
      key: "sketch-cubic",
      prompt: "Sketch $y = x^{3} - x$ showing the local max/min shape with control points.",
      answer: "x^3 - x",
      domain: [-2, 2],
      range: [-2, 2],
    },
  ],
  integrals: [
    {
      key: "sketch-accum",
      prompt: "Sketch $y = e^{x}$ on $[-1, 1]$ — the accumulation growth curve.",
      answer: "exp(x)",
      domain: [-1, 1],
      range: [0, 3],
    },
  ],
};

type FeatureVariant = {
  key: string;
  prompt: string;
  curve: string;
  points: Array<{ x: number; tolerance: number; label: string }>;
  domain: [number, number];
};

const FEATURE_BY_FAMILY: Record<string, FeatureVariant[]> = {
  limits: [
    {
      key: "feat-vertex",
      prompt: "On $f(x) = x^{2} - 2x$, mark the vertex critical point near $x = 1$.",
      curve: "x^2 - 2*x",
      points: [{ x: 1, tolerance: 0.35, label: "vertex" }],
      domain: [-1, 3],
    },
  ],
  derivatives: [
    {
      key: "feat-crit",
      prompt: "On $f(x) = x^{3} - 3x$, mark critical points near $x = -1$ and $x = 1$.",
      curve: "x^3 - 3*x",
      points: [
        { x: -1, tolerance: 0.35, label: "local ext" },
        { x: 1, tolerance: 0.35, label: "local ext" },
      ],
      domain: [-2.5, 2.5],
    },
  ],
  applications: [
    {
      key: "feat-opt",
      prompt: "On $f(x) = -x^{2} + 4x$, mark the maximum near $x = 2$ (optimization decision).",
      curve: "-x^2 + 4*x",
      points: [{ x: 2, tolerance: 0.35, label: "max" }],
      domain: [-0.5, 4.5],
    },
  ],
  integrals: [
    {
      key: "feat-area-ends",
      prompt: "On $f(x) = \\sin(x)$, mark the zeros near $x = 0$ and $x = \\pi$ (accumulation bounds).",
      curve: "sin(x)",
      points: [
        { x: 0, tolerance: 0.35, label: "zero" },
        { x: 3.14, tolerance: 0.4, label: "zero" },
      ],
      domain: [-0.5, 3.6],
    },
  ],
};

const DRAG_BY_FAMILY: Record<
  string,
  Array<{ key: string; prompt: string; options: string[]; curve: string; curve2?: string }>
> = {
  limits: [
    {
      key: "drag-def",
      prompt: "Order the steps to build $f'(a)$ from the definition of the derivative.",
      options: [
        "Write the difference quotient at x = a",
        "Simplify the algebra in h",
        "Take the limit as h → 0",
        "State f'(a) as the instantaneous rate",
      ],
      curve: "x^2",
    },
  ],
  derivatives: [
    {
      key: "drag-product",
      prompt: "Order the analyst pipeline to differentiate a product $uv$.",
      options: [
        "Identify factors u and v from the model",
        "Construct u' and v' with the correct rules",
        "Assemble u'v + uv'",
        "Simplify and state the rate interpretation",
      ],
      curve: "x^2",
      curve2: "sin(x)",
    },
  ],
  applications: [
    {
      key: "drag-opt",
      prompt: "Order the steps for a closed-interval optimization decision.",
      options: [
        "Identify the objective function and domain",
        "Find critical points from f'(x) = 0",
        "Evaluate f at critical points and endpoints",
        "Select the max/min that answers the decision",
      ],
      curve: "x^3 - 3*x",
    },
  ],
  integrals: [
    {
      key: "drag-ftc",
      prompt: "Order the steps to evaluate a definite integral with an antiderivative.",
      options: [
        "Find an antiderivative F of the integrand",
        "Evaluate F at the upper bound",
        "Subtract F at the lower bound",
        "Interpret the net change / accumulated quantity",
      ],
      curve: "3*x^2 - 2",
    },
  ],
};

function pickVariant<T>(variants: T[], nodeName: string, salt: number): T {
  const idx = (hashNodeKey(nodeName) + salt) % Math.max(1, variants.length);
  return variants[idx]!;
}

function graphStimulus(curve: string, label: string, domain: [number, number] = [-2, 2], curve2?: string) {
  const curves = [
    { expression: curve, color: "#2D70B3", label },
    ...(curve2 ? [{ expression: curve2, color: "#6366F1", label: "v" }] : []),
  ];
  return [
    {
      kind: "function_graph",
      title: "Function graph",
      alt: `Graph of ${label}`,
      domain,
      curves,
    },
  ];
}

/** Built per skill node — math and format mix depend on unit + node identity. */
export function buildConstructionTemplatesForNode(
  nodeName: string,
  unitNumber?: number | null,
): ConstructionTemplateRow[] {
  const safeName = nodeName.trim() || "this skill";
  const family = unitFamily(unitNumber);
  const fr = pickVariant(FR_BY_FAMILY[family] ?? FR_BY_FAMILY.derivatives!, safeName, 1);
  const cloze = pickVariant(CLOZE_BY_FAMILY[family] ?? CLOZE_BY_FAMILY.derivatives!, safeName, 2);
  const sketch = pickVariant(SKETCH_BY_FAMILY[family] ?? SKETCH_BY_FAMILY.derivatives!, safeName, 3);
  const feature = pickVariant(FEATURE_BY_FAMILY[family] ?? FEATURE_BY_FAMILY.derivatives!, safeName, 4);
  const drag = pickVariant(DRAG_BY_FAMILY[family] ?? DRAG_BY_FAMILY.derivatives!, safeName, 5);

  // Second FR from another family slot for extra run variety when seeded.
  const frAltPool = FR_BY_FAMILY[family] ?? FR_BY_FAMILY.derivatives!;
  const frAlt = pickVariant(frAltPool, safeName, 11);

  return [
    {
      item_format: "free_response",
      prompt: `Skill proof · ${safeName}: ${fr.promptMath}. Construct the simplified expression.`,
      options: null,
      correct_answer: fr.answer,
      answer_expression: fr.answer,
      explanation: fr.explanation,
      solution_steps: fr.steps.map((s, i) => ({
        step_number: i + 1,
        description: s.description,
        expression: s.expression,
        misconception_if_skipped: s.misconception_if_skipped,
        is_critical: true,
      })),
      stimulus: graphStimulus(fr.curve, fr.label),
      authoring_meta: {
        ...DOCTRINE_BASE,
        skill_verb: "compute",
        misconception_kit: fr.misconception_kit,
        template_key: `${family}:${fr.key}`,
      },
      difficulty_rating: 900 + (hashNodeKey(safeName) % 200),
    },
    {
      item_format: "complete_expression",
      prompt: `Cloze construction · ${safeName}: ${cloze.prompt}`,
      options: null,
      correct_answer: cloze.answer,
      answer_expression: cloze.answer,
      explanation: "Fill the verified blank. Symbolic equivalence is graded automatically.",
      solution_steps: [{ key: "a", expression: cloze.answer, weight: 1 }],
      stimulus: graphStimulus(cloze.curve, cloze.label),
      authoring_meta: {
        ...DOCTRINE_BASE,
        skill_verb: "construct",
        misconception_kit: ["forgot_chain_rule", "dropped_constant", "blank_miss"],
        template_key: `${family}:${cloze.key}`,
      },
      difficulty_rating: 850 + (hashNodeKey(safeName + "c") % 200),
    },
    {
      item_format: "drag_order",
      prompt: `Method pipeline · ${safeName}: ${drag.prompt}`,
      options: drag.options,
      correct_answer: drag.options[0]!,
      answer_expression: null,
      explanation: "Correct order is verified method skill, not memorization of a single formula.",
      solution_steps: [],
      stimulus: graphStimulus(drag.curve, "model", [-2, 2], drag.curve2),
      authoring_meta: {
        ...DOCTRINE_BASE,
        skill_verb: "justify",
        misconception_kit: ["wrong_order", "skip_setup", "forget_interpret"],
        template_key: `${family}:${drag.key}`,
      },
      difficulty_rating: 880 + (hashNodeKey(safeName + "d") % 180),
    },
    {
      item_format: "graph_feature",
      prompt: `Sketch proof · ${safeName}: ${sketch.prompt}`,
      options: null,
      correct_answer: sketch.answer,
      answer_expression: sketch.answer,
      explanation: "Polyline is sampled against the verified curve.",
      solution_steps: [],
      stimulus: [
        {
          kind: "function_graph",
          title: "Sketch grid",
          alt: `Empty axes for ${sketch.answer}`,
          domain: sketch.domain,
          range: sketch.range,
          curves: [],
          sketch: true,
        },
      ],
      authoring_meta: {
        ...DOCTRINE_BASE,
        skill_verb: "construct",
        misconception_kit: ["shape_error", "amplitude_error", "domain_miss"],
        template_key: `${family}:${sketch.key}`,
      },
      difficulty_rating: 1000 + (hashNodeKey(safeName + "s") % 200),
    },
    {
      item_format: "graph_feature",
      prompt: `Feature decision · ${safeName}: ${feature.prompt}`,
      options: null,
      correct_answer: "feature marks",
      answer_expression: null,
      explanation: "Feature hits are graded by tolerance against authored targets.",
      solution_steps: feature.points.map((p) => ({ kind: "point", ...p })),
      stimulus: graphStimulus(feature.curve, "f(x)", feature.domain),
      authoring_meta: {
        ...DOCTRINE_BASE,
        skill_verb: "interpret",
        misconception_kit: ["miss_critical_point", "endpoint_confusion", "tolerance_miss"],
        template_key: `${family}:${feature.key}`,
      },
      difficulty_rating: 1050 + (hashNodeKey(safeName + "f") % 200),
    },
    {
      item_format: "free_response",
      prompt: `Alternate construction · ${safeName}: ${frAlt.promptMath}. Construct the simplified expression.`,
      options: null,
      correct_answer: frAlt.answer,
      answer_expression: frAlt.answer,
      explanation: frAlt.explanation,
      solution_steps: frAlt.steps.map((s, i) => ({
        step_number: i + 1,
        description: s.description,
        expression: s.expression,
        misconception_if_skipped: s.misconception_if_skipped,
        is_critical: true,
      })),
      stimulus: graphStimulus(frAlt.curve, frAlt.label),
      authoring_meta: {
        ...DOCTRINE_BASE,
        skill_verb: "compute",
        misconception_kit: frAlt.misconception_kit,
        template_key: `${family}:${frAlt.key}:alt`,
      },
      difficulty_rating: 1100 + (hashNodeKey(safeName + "a") % 150),
    },
  ];
}

/** Stable fingerprint so pack selection can avoid near-duplicate stems. */
export function constructionTemplateFingerprint(row: {
  item_format?: string | null;
  prompt?: string | null;
  answer_expression?: string | null;
  authoring_meta?: { template_key?: string } | null;
}): string {
  const key = row.authoring_meta?.template_key?.trim();
  if (key) return key;
  const format = String(row.item_format ?? "").toLowerCase();
  const answer = String(row.answer_expression ?? "").replace(/\s/g, "");
  const stem = String(row.prompt ?? "")
    .replace(/\$[^$]*\$/g, "")
    .replace(/Skill proof ·[^:]+:|Cloze construction ·[^:]+:|Method pipeline ·[^:]+:|Sketch proof ·[^:]+:|Feature decision ·[^:]+:|Alternate construction ·[^:]+:/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64)
    .toLowerCase();
  return `${format}|${answer}|${stem}`;
}

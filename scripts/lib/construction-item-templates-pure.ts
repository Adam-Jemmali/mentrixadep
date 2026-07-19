/**
 * Deterministic construction templates — no Gemini.
 * Each skill node gets unique math (coefficients from node hash), not the same UV / 4x^2 stem.
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

export function unitFamily(
  unitNumber: number | null | undefined,
): "limits" | "derivatives" | "applications" | "integrals" {
  const u = unitNumber ?? 2;
  if (u <= 1) return "limits";
  if (u <= 3) return "derivatives";
  if (u <= 5) return "applications";
  return "integrals";
}

/** Stable nonzero coefficient in [min, max], never zero. */
export function coeffFrom(nodeName: string, salt: number, min: number, max: number): number {
  const span = Math.max(1, max - min + 1);
  let n = min + (hashNodeKey(`${nodeName}::${salt}`) % span);
  if (n === 0) n = min === 0 ? 1 : min;
  return n;
}

function graphStimulus(
  curve: string,
  label: string,
  domain: [number, number] = [-2, 2],
  curve2?: string,
) {
  const curves = [
    { expression: curve, color: "#2D70B3", label },
    ...(curve2 ? [{ expression: curve2, color: "#6366F1", label: "g" }] : []),
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

function frRow(args: {
  nodeName: string;
  family: string;
  key: string;
  promptMath: string;
  answer: string;
  curve: string;
  label: string;
  steps: Array<{ description: string; expression: string; misconception_if_skipped: string }>;
  explanation: string;
  misconception_kit: readonly string[];
  ratingSalt: string;
}): ConstructionTemplateRow {
  return {
    item_format: "free_response",
    prompt: `Skill proof · ${args.nodeName}: ${args.promptMath}. Construct the simplified expression.`,
    options: null,
    correct_answer: args.answer,
    answer_expression: args.answer,
    explanation: args.explanation,
    solution_steps: args.steps.map((s, i) => ({
      step_number: i + 1,
      description: s.description,
      expression: s.expression,
      misconception_if_skipped: s.misconception_if_skipped,
      is_critical: true,
    })),
    stimulus: graphStimulus(args.curve, args.label),
    authoring_meta: {
      ...DOCTRINE_BASE,
      skill_verb: "compute",
      misconception_kit: args.misconception_kit,
      template_key: `${args.family}:${args.key}:${args.answer}`,
    },
    difficulty_rating: 820 + (hashNodeKey(args.nodeName + args.ratingSalt) % 280),
  };
}

/**
 * Built per skill node — many unique expressions so packs do not recycle the same UV / poly stem.
 */
export function buildConstructionTemplatesForNode(
  nodeName: string,
  unitNumber?: number | null,
): ConstructionTemplateRow[] {
  const safeName = nodeName.trim() || "this skill";
  const family = unitFamily(unitNumber);
  const a = coeffFrom(safeName, 1, 2, 9);
  const b = coeffFrom(safeName, 2, 1, 7);
  const c = coeffFrom(safeName, 3, 2, 6);
  const d = coeffFrom(safeName, 4, 1, 5);
  const e = coeffFrom(safeName, 5, 2, 8);
  const n = 2 + (hashNodeKey(safeName + "pow") % 3); // 2..4
  const out: ConstructionTemplateRow[] = [];

  // --- Free response: unique polys / trig / exp per node ---
  if (family === "limits" || family === "derivatives") {
    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `power-${a}x${n}`,
        promptMath: `differentiate $f(x) = ${a}x^{${n}}$`,
        answer: n === 2 ? `${a * 2}*x` : n === 3 ? `${a * 3}*x^2` : `${a * 4}*x^3`,
        curve: `${a}*x^${n}`,
        label: "f(x)",
        steps: [
          {
            description: "Apply power rule",
            expression: n === 2 ? `${a * 2}*x` : n === 3 ? `${a * 3}*x^2` : `${a * 4}*x^3`,
            misconception_if_skipped: "forgot_coefficient",
          },
        ],
        explanation: `Power rule on ${a}x^${n}.`,
        misconception_kit: ["forgot_coefficient", "power_rule_off_by_one", "dropped_constant"],
        ratingSalt: "fr1",
      }),
    );
    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `poly-${a}-${b}`,
        promptMath: `a position model is $s(t) = ${a}t^{3} - ${b}t$. Construct velocity $v(t) = s'(t)$`,
        answer: `${3 * a}*t^2 - ${b}`,
        curve: `${a}*x^3 - ${b}*x`,
        label: "s(t)",
        steps: [
          {
            description: `Differentiate ${a}t^3`,
            expression: `${3 * a}*t^2`,
            misconception_if_skipped: "forgot_coefficient",
          },
          {
            description: `Differentiate -${b}t`,
            expression: `${3 * a}*t^2 - ${b}`,
            misconception_if_skipped: "dropped_constant",
          },
        ],
        explanation: `v(t) = ${3 * a}t^2 - ${b}.`,
        misconception_kit: ["forgot_coefficient", "dropped_constant", "power_rule_off_by_one"],
        ratingSalt: "fr2",
      }),
    );
    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `trig-${c}`,
        promptMath: `an oscillatory signal is $h(t) = \\cos(${c}t)$. Construct $h'(t)$`,
        answer: `-${c}*sin(${c}*t)`,
        curve: `cos(${c}*x)`,
        label: "h(t)",
        steps: [
          {
            description: "Chain rule on cos",
            expression: `-${c}*sin(${c}*t)`,
            misconception_if_skipped: "forgot_chain_rule",
          },
        ],
        explanation: `d/dt cos(${c}t) = -${c}sin(${c}t).`,
        misconception_kit: ["forgot_chain_rule", "sign_error", "trig_derivative_swap"],
        ratingSalt: "fr3",
      }),
    );
    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `exp-${d}`,
        promptMath: `a growth model is $P(t) = e^{${d}t}$. Construct $P'(t)$`,
        answer: `${d}*e^(${d}*t)`,
        curve: `exp(${d}*x)`,
        label: "P(t)",
        steps: [
          {
            description: "Exponential chain rule",
            expression: `${d}*e^(${d}*t)`,
            misconception_if_skipped: "forgot_chain_rule",
          },
        ],
        explanation: `d/dt e^{${d}t} = ${d}e^{${d}t}.`,
        misconception_kit: ["forgot_chain_rule", "exp_coeff_error", "dropped_constant"],
        ratingSalt: "fr4",
      }),
    );
    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `sin-${e}`,
        promptMath: `differentiate $g(x) = \\sin(${e}x)$`,
        answer: `${e}*cos(${e}*x)`,
        curve: `sin(${e}*x)`,
        label: "g(x)",
        steps: [
          {
            description: "Chain rule on sin",
            expression: `${e}*cos(${e}*x)`,
            misconception_if_skipped: "forgot_chain_rule",
          },
        ],
        explanation: `d/dx sin(${e}x) = ${e}cos(${e}x).`,
        misconception_kit: ["forgot_chain_rule", "trig_derivative_swap", "sign_error"],
        ratingSalt: "fr5",
      }),
    );
  }

  if (family === "applications") {
    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `opt-${a}`,
        promptMath: `for $f(x) = x^{3} - ${a}x$, construct $f'(x)$ used to locate critical points`,
        answer: `3*x^2 - ${a}`,
        curve: `x^3 - ${a}*x`,
        label: "f(x)",
        steps: [
          {
            description: "Differentiate",
            expression: `3*x^2 - ${a}`,
            misconception_if_skipped: "forgot_coefficient",
          },
        ],
        explanation: `Optimization starts from f'(x) = 3x^2 - ${a}.`,
        misconception_kit: ["forgot_coefficient", "critical_point_miss", "sign_chart_error"],
        ratingSalt: "app1",
      }),
    );
    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `related-${b}`,
        promptMath: `related-rates setup: if $A = ${b}\\pi r^{2}$, construct $dA/dr$`,
        answer: `${2 * b}*pi*r`,
        curve: `${b}*pi*x^2`,
        label: "A(r)",
        steps: [
          {
            description: "Power rule on r^2",
            expression: `${2 * b}*pi*r`,
            misconception_if_skipped: "forgot_coefficient",
          },
        ],
        explanation: `dA/dr = ${2 * b}πr.`,
        misconception_kit: ["forgot_coefficient", "pi_drop", "power_rule_off_by_one"],
        ratingSalt: "app2",
      }),
    );
    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `ln-${c}`,
        promptMath: `differentiate $y = \\ln(${c}x)$`,
        answer: "1/x",
        curve: `log(${c}*x)`,
        label: "y",
        steps: [
          {
            description: "d/dx ln(cx)",
            expression: "1/x",
            misconception_if_skipped: "forgot_chain_rule",
          },
        ],
        explanation: "d/dx ln(cx) = 1/x.",
        misconception_kit: ["forgot_chain_rule", "log_coeff_error", "reciprocal_miss"],
        ratingSalt: "app3",
      }),
    );
  }

  if (family === "integrals") {
    const antiAns = a % 3 === 0 ? `${a / 3}*x^3 - ${b}*x` : `(${a}/3)*x^3 - ${b}*x`;
    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `anti-${a}-${b}`,
        promptMath: `construct an antiderivative of $f(x) = ${a}x^{2} - ${b}$ (omit +C)`,
        answer: antiAns,
        curve: `${a}*x^2 - ${b}`,
        label: "f(x)",
        steps: [
          {
            description: `Integrate ${a}x^2`,
            expression: a % 3 === 0 ? `${a / 3}*x^3` : `(${a}/3)*x^3`,
            misconception_if_skipped: "integral_power_error",
          },
          {
            description: `Integrate -${b}`,
            expression: antiAns,
            misconception_if_skipped: "dropped_constant",
          },
        ],
        explanation: "Antiderivative construction from power rule for integrals.",
        misconception_kit: ["integral_power_error", "dropped_constant", "forgot_plus_c"],
        ratingSalt: "int1",
      }),
    );

    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `ftc-${a}`,
        promptMath: `if $F(x) = \\int_{0}^{x} (${a}t^{2} - ${b})\\,dt$, construct $F'(x)$ by FTC`,
        answer: `${a}*x^2 - ${b}`,
        curve: `${a}*x^2 - ${b}`,
        label: "integrand",
        steps: [
          {
            description: "FTC",
            expression: `${a}*x^2 - ${b}`,
            misconception_if_skipped: "ftc_miss",
          },
        ],
        explanation: "FTC: F'(x) equals the integrand at x.",
        misconception_kit: ["ftc_miss", "bound_swap", "forgot_chain_rule"],
        ratingSalt: "int2",
      }),
    );
    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `int-lin-${c}`,
        promptMath: `construct an antiderivative of $f(x) = ${c}x$ (omit +C)`,
        answer: c % 2 === 0 ? `${c / 2}*x^2` : `(${c}/2)*x^2`,
        curve: `${c}*x`,
        label: "f(x)",
        steps: [
          {
            description: "Integrate",
            expression: c % 2 === 0 ? `${c / 2}*x^2` : `(${c}/2)*x^2`,
            misconception_if_skipped: "integral_power_error",
          },
        ],
        explanation: `∫ ${c}x dx = ${c % 2 === 0 ? `${c / 2}x^2` : `(${c}/2)x^2`}.`,
        misconception_kit: ["integral_power_error", "forgot_plus_c", "dropped_constant"],
        ratingSalt: "int3",
      }),
    );
  }

  // --- Cloze ---
  const clozeAnsFixed =
    family === "integrals"
      ? c % 2 === 0
        ? `${c / 2}*x^2`
        : `(${c}/2)*x^2`
      : family === "applications"
        ? `${a}*x`
        : `${2 * a}*x`;
  const clozePrompt =
    family === "integrals"
      ? `Complete an antiderivative: $\\int ${c}x\\,dx = {{a}}$ (omit +C).`
      : family === "applications"
        ? `Complete: if $f(x) = \\frac{${a}}{2}x^{2}$, then $f'(x) = {{a}}.`
        : `Complete: if $f(x) = ${a}x^{2}$, then $f'(x) = {{a}}$.`;
  const clozeCurve =
    family === "integrals" ? `${c}*x` : family === "applications" ? `(${a}/2)*x^2` : `${a}*x^2`;

  out.push({
    item_format: "complete_expression",
    prompt: `Cloze construction · ${safeName}: ${clozePrompt}`,
    options: null,
    correct_answer: clozeAnsFixed,
    answer_expression: clozeAnsFixed,
    explanation: "Fill the verified blank. Symbolic equivalence is graded automatically.",
    solution_steps: [{ key: "a", expression: clozeAnsFixed, weight: 1 }],
    stimulus: graphStimulus(clozeCurve, "f"),
    authoring_meta: {
      ...DOCTRINE_BASE,
      skill_verb: "construct",
      misconception_kit: ["forgot_chain_rule", "dropped_constant", "blank_miss"],
      template_key: `${family}:cloze:${clozeAnsFixed}`,
    },
    difficulty_rating: 850 + (hashNodeKey(safeName + "c") % 200),
  });

  // Second cloze — trig or exp, never the same as first
  const cloze2Ans =
    family === "integrals" ? "e^x" : `${b}*cos(${b}*x)`;
  const cloze2Prompt =
    family === "integrals"
      ? "Complete: $\\int e^{x}\\,dx = {{a}}$ (omit +C)."
      : `Complete: if $g(x) = \\sin(${b}x)$, then $g'(x) = {{a}}$.`;
  out.push({
    item_format: "complete_expression",
    prompt: `Cloze construction · ${safeName}: ${cloze2Prompt}`,
    options: null,
    correct_answer: cloze2Ans,
    answer_expression: cloze2Ans,
    explanation: "Fill the verified blank.",
    solution_steps: [{ key: "a", expression: cloze2Ans, weight: 1 }],
    stimulus: graphStimulus(family === "integrals" ? "exp(x)" : `sin(${b}*x)`, "g"),
    authoring_meta: {
      ...DOCTRINE_BASE,
      skill_verb: "construct",
      misconception_kit: ["forgot_chain_rule", "trig_derivative_swap", "blank_miss"],
      template_key: `${family}:cloze2:${cloze2Ans}`,
    },
    difficulty_rating: 880 + (hashNodeKey(safeName + "c2") % 180),
  });

  // --- Drag: rotate among DIFFERENT pipelines (not always UV) ---
  const dragVariants = [
    {
      key: `drag-def-${a}`,
      prompt: `Order the steps to build $f'(${a})$ from the definition of the derivative.`,
      options: [
        `Write the difference quotient at x = ${a}`,
        "Simplify the algebra in h",
        "Take the limit as h → 0",
        `State f'(${a}) as the instantaneous rate`,
      ],
      curve: `${a}*x^2`,
    },
    {
      key: `drag-chain-${c}`,
      prompt: `Order the chain-rule pipeline for $\\sin(${c}x)$.`,
      options: [
        "Identify the outer and inner functions",
        "Differentiate the outer, leave the inner",
        "Multiply by the inner derivative",
        "Simplify the composed derivative",
      ],
      curve: `sin(${c}*x)`,
    },
    {
      key: `drag-product-${a}-${b}`,
      prompt: `Order the product-rule pipeline for $u(x)=x^{${a}}$ and $v(x)=\\sin(${b}x)$ (not a generic $uv$ slogan).`,
      options: [
        `Identify u = x^${a} and v = sin(${b}x)`,
        "Construct u' and v' with the correct rules",
        "Assemble u'v + uv'",
        "Simplify and state the rate interpretation",
      ],
      curve: `x^${a}`,
      curve2: `sin(${b}*x)`,
    },
    {
      key: `drag-ftc-${d}`,
      prompt: "Order the steps to evaluate a definite integral with an antiderivative.",
      options: [
        "Find an antiderivative F of the integrand",
        "Evaluate F at the upper bound",
        "Subtract F at the lower bound",
        "Interpret the net change / accumulated quantity",
      ],
      curve: `${d}*x^2 - ${b}`,
    },
  ];
  const dragPick = dragVariants[hashNodeKey(safeName + "drag") % dragVariants.length]!;
  out.push({
    item_format: "drag_order",
    prompt: `Method pipeline · ${safeName}: ${dragPick.prompt}`,
    options: dragPick.options,
    correct_answer: dragPick.options[0]!,
    answer_expression: null,
    explanation: "Correct order is verified method skill, not memorization of a single formula.",
    solution_steps: [],
    stimulus: graphStimulus(dragPick.curve, "model", [-2, 2], dragPick.curve2),
    authoring_meta: {
      ...DOCTRINE_BASE,
      skill_verb: "justify",
      misconception_kit: ["wrong_order", "skip_setup", "forget_interpret"],
      template_key: `${family}:${dragPick.key}`,
    },
    difficulty_rating: 880 + (hashNodeKey(safeName + "d") % 180),
  });

  // Second drag from a different slot so packs can avoid UV-only
  const dragAlt = dragVariants[(hashNodeKey(safeName + "drag") + 1) % dragVariants.length]!;
  out.push({
    item_format: "drag_order",
    prompt: `Method pipeline · ${safeName}: ${dragAlt.prompt}`,
    options: dragAlt.options,
    correct_answer: dragAlt.options[0]!,
    answer_expression: null,
    explanation: "Correct order is verified method skill.",
    solution_steps: [],
    stimulus: graphStimulus(dragAlt.curve, "model", [-2, 2], dragAlt.curve2),
    authoring_meta: {
      ...DOCTRINE_BASE,
      skill_verb: "justify",
      misconception_kit: ["wrong_order", "skip_setup", "forget_interpret"],
      template_key: `${family}:${dragAlt.key}:alt`,
    },
    difficulty_rating: 900 + (hashNodeKey(safeName + "d2") % 160),
  });

  // --- Sketch ---
  const sketchAns =
    family === "integrals"
      ? "exp(x)"
      : family === "applications"
        ? "x^3 - x"
        : hashNodeKey(safeName) % 2 === 0
          ? "sin(x)"
          : `${a}*x^2 - ${b}`;
  const sketchPrompt =
    sketchAns === "exp(x)"
      ? "Sketch $y = e^{x}$ on $[-1, 1]$ — the accumulation growth curve."
      : sketchAns === "x^3 - x"
        ? "Sketch $y = x^{3} - x$ showing the local max/min shape with control points."
        : sketchAns === "sin(x)"
          ? "Sketch $y = \\sin(x)$ on $[-\\pi, \\pi]$ with control points on the verified sine wave."
          : `Sketch $y = ${a}x^{2} - ${b}$ with control points that follow the verified parabola.`;
  out.push({
    item_format: "graph_feature",
    prompt: `Sketch proof · ${safeName}: ${sketchPrompt}`,
    options: null,
    correct_answer: sketchAns,
    answer_expression: sketchAns,
    explanation: "Polyline is sampled against the verified curve.",
    solution_steps: [],
    stimulus: [
      {
        kind: "function_graph",
        title: "Sketch grid",
        alt: `Empty axes for ${sketchAns}`,
        domain: sketchAns === "sin(x)" ? [-3.2, 3.2] : sketchAns === "exp(x)" ? [-1, 1] : [-2, 2],
        range: sketchAns === "sin(x)" ? [-1.5, 1.5] : sketchAns === "exp(x)" ? [0, 3] : [-2, 8],
        curves: [],
        sketch: true,
      },
    ],
    authoring_meta: {
      ...DOCTRINE_BASE,
      skill_verb: "construct",
      misconception_kit: ["shape_error", "amplitude_error", "domain_miss"],
      template_key: `${family}:sketch:${sketchAns}`,
    },
    difficulty_rating: 1000 + (hashNodeKey(safeName + "s") % 200),
  });

  // --- Feature mark ---
  const featX = family === "applications" ? 2 : 1;
  const featCurve =
    family === "applications"
      ? `-x^2 + ${2 * featX}*x`
      : family === "integrals"
        ? "sin(x)"
        : `x^2 - ${2 * featX}*x`;
  out.push({
    item_format: "graph_feature",
    prompt:
      family === "integrals"
        ? `Feature decision · ${safeName}: On $f(x) = \\sin(x)$, mark the zeros near $x = 0$ and $x = \\pi$ (accumulation bounds).`
        : `Feature decision · ${safeName}: On $f(x) = ${featCurve.replace(/\*/g, "")}$, mark the critical point near $x = ${featX}$.`,
    options: null,
    correct_answer: `x=${featX}`,
    answer_expression: null,
    explanation: "Marked feature is checked against authored coordinates.",
    solution_steps:
      family === "integrals"
        ? [
            { kind: "point", x: 0, tolerance: 0.35, label: "zero" },
            { kind: "point", x: 3.14, tolerance: 0.4, label: "zero" },
          ]
        : [{ kind: "point", x: featX, tolerance: 0.35, label: "critical" }],
    stimulus: graphStimulus(
      family === "integrals" ? "sin(x)" : featCurve,
      "f(x)",
      family === "integrals" ? [-0.5, 3.6] : [-1, 4],
    ),
    authoring_meta: {
      ...DOCTRINE_BASE,
      skill_verb: "interpret",
      misconception_kit: ["feature_miss", "tolerance_miss", "axis_swap"],
      template_key: `${family}:feat:${featCurve}:${featX}`,
    },
    difficulty_rating: 940 + (hashNodeKey(safeName + "f") % 160),
  });

  // Extra FR so each node has 10+ distinct keys
  if (family === "limits" || family === "derivatives") {
    out.push(
      frRow({
        nodeName: safeName,
        family,
        key: `lin-${a}-${d}`,
        promptMath: `differentiate $f(x) = ${a}x - ${d}$`,
        answer: `${a}`,
        curve: `${a}*x - ${d}`,
        label: "f(x)",
        steps: [
          {
            description: "Derivative of linear",
            expression: `${a}`,
            misconception_if_skipped: "dropped_constant",
          },
        ],
        explanation: `f'(x) = ${a}.`,
        misconception_kit: ["dropped_constant", "forgot_coefficient", "power_rule_off_by_one"],
        ratingSalt: "fr6",
      }),
    );
  }

  return out;
}

export function constructionTemplateKey(
  row: ConstructionTemplateRow | { authoring_meta?: { template_key?: string } | null },
): string {
  const key =
    "authoring_meta" in row ? row.authoring_meta?.template_key?.trim() : undefined;
  return key ?? "";
}

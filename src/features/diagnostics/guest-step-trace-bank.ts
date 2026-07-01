import {
  parseStepTraceSequence,
  type StepTraceSequence,
} from "@/features/diagnostics/step-trace-types";

/** Offline reviewed pool for guest try when item_bank.step_sequence is not seeded yet. */
export type GuestStepTraceBankEntry = {
  itemId: string;
  nodeSlug: string;
  unitNumber: number;
  unitName: string;
  nodeName: string;
  examStakes?: string;
  prompt: string;
  stepSequence: StepTraceSequence;
};

const RAW_BANK: GuestStepTraceBankEntry[] = [
  {
    itemId: "guest-step-trace-power-01",
    nodeSlug: "power-rule",
    unitNumber: 2,
    unitName: "Differentiation Definition and Properties",
    nodeName: "Power rule",
    examStakes: "The power rule appears on every AP Calculus AB exam.",
    prompt: "Find $\\frac{d}{dx}(5x^3)$.",
    stepSequence: [
      {
        step_number: 1,
        prompt: "Which rule applies to $5x^3$?",
        options: ["Power rule", "Product rule", "Chain rule"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "Product rule": "treats monomial as a product of functions",
          "Chain rule": "confuses power with composition",
        },
      },
      {
        step_number: 2,
        prompt: "After applying the power rule, what is the derivative?",
        options: ["$15x^2$", "$5x^2$", "$15x^3$"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "$5x^2$": "forgets to multiply by the coefficient",
          "$15x^3$": "forgets to reduce the exponent",
        },
      },
    ],
  },
  {
    itemId: "guest-step-trace-limit-laws-01",
    nodeSlug: "limit-laws-and-algebraic-limits",
    unitNumber: 1,
    unitName: "Limits and Continuity",
    nodeName: "Limit laws and algebraic limits",
    examStakes: "Limit laws are tested directly and inside derivative definition items.",
    prompt: "Evaluate $\\lim_{x \\to 2}(3x + 1)$.",
    stepSequence: [
      {
        step_number: 1,
        prompt: "Is this limit direct substitution?",
        options: [
          "Yes, the expression is continuous at $x = 2$",
          "No, factor first",
          "No, rationalize first",
        ],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "No, factor first": "overcomplicates a continuous linear function",
          "No, rationalize first": "forces algebra when substitution works",
        },
      },
      {
        step_number: 2,
        prompt: "Substitute $x = 2$ to get the limit value.",
        options: ["$7$", "$5$", "$6$"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "$5$": "forgets to add the constant term",
          "$6$": "arithmetic slip on $3(2) + 1$",
        },
      },
    ],
  },
  {
    itemId: "guest-step-trace-chain-01",
    nodeSlug: "chain-rule-basics",
    unitNumber: 3,
    unitName: "Differentiation Composite Implicit Inverse",
    nodeName: "Chain rule basics",
    examStakes: "Chain rule items are among the most missed on AB free response.",
    prompt: "Find $\\frac{d}{dx}((2x + 1)^4)$.",
    stepSequence: [
      {
        step_number: 1,
        prompt: "Identify the outer function $f(u)$ where $u = 2x + 1$.",
        options: ["$u^4$", "$2u^4$", "$(2u)^4$"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "$2u^4$": "pulls the inner coefficient into the outer layer",
          "$(2u)^4$": "treats the inner linear term as part of the outer base",
        },
      },
      {
        step_number: 2,
        prompt: "Apply the chain rule: outer derivative times inner derivative.",
        options: ["$4(2x+1)^3 \\cdot 2$", "$4(2x+1)^3$", "$4(2x+1)^3 \\cdot (2x+1)$"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "$4(2x+1)^3$": "forgets the inner derivative",
          "$4(2x+1)^3 \\cdot (2x+1)$": "multiplies by the inner function instead of its derivative",
        },
      },
    ],
  },
  {
    itemId: "guest-step-trace-algebraic-limit-01",
    nodeSlug: "limits-by-algebraic-manipulation",
    unitNumber: 1,
    unitName: "Limits and Continuity",
    nodeName: "Limits by algebraic manipulation",
    prompt: "Evaluate $\\lim_{x \\to 2}\\frac{x^2 - 4}{x - 2}$.",
    stepSequence: [
      {
        step_number: 1,
        prompt: "What happens if you substitute $x = 2$ directly?",
        options: [
          "You get $\\frac{0}{0}$, an indeterminate form",
          "The limit is $0$",
          "The limit is undefined and does not exist",
        ],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "The limit is $0$": "confuses indeterminate form with limit value",
          "The limit is undefined and does not exist":
            "gives up before simplifying the removable discontinuity",
        },
      },
      {
        step_number: 2,
        prompt: "After factoring the numerator, what is the simplified limit?",
        options: ["$4$", "$2$", "$0$"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "$2$": "cancels incorrectly after factoring",
          "$0$": "stops at the hole value without simplifying",
        },
      },
    ],
  },
  {
    itemId: "guest-step-trace-sum-rule-01",
    nodeSlug: "sum-and-difference-rules",
    unitNumber: 2,
    unitName: "Differentiation Definition and Properties",
    nodeName: "Sum and difference rules",
    prompt: "Find $\\frac{d}{dx}(x^2 + 3x)$.",
    stepSequence: [
      {
        step_number: 1,
        prompt: "How should you differentiate a sum of terms?",
        options: [
          "Differentiate each term and add the results",
          "Differentiate only the highest power term",
          "Multiply the derivatives of each term",
        ],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "Differentiate only the highest power term": "drops terms in a sum",
          "Multiply the derivatives of each term": "applies product rule to a sum",
        },
      },
      {
        step_number: 2,
        prompt: "What is the derivative?",
        options: ["$2x + 3$", "$2x + 3x$", "$x + 3$"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "$2x + 3x$": "forgets that the derivative of $3x$ is $3$",
          "$x + 3$": "power rule slip on $x^2$",
        },
      },
    ],
  },
  {
    itemId: "guest-step-trace-constant-multiple-01",
    nodeSlug: "constant-multiple-rule",
    unitNumber: 2,
    unitName: "Differentiation Definition and Properties",
    nodeName: "Constant multiple rule",
    prompt: "Find $\\frac{d}{dx}(-4x^2)$.",
    stepSequence: [
      {
        step_number: 1,
        prompt: "What does the constant multiple rule let you do?",
        options: [
          "Pull the constant out before differentiating",
          "Ignore the constant entirely",
          "Differentiate the constant and the variable separately as a product",
        ],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "Ignore the constant entirely": "drops the scalar factor",
          "Differentiate the constant and the variable separately as a product":
            "misapplies product rule to a scalar multiple",
        },
      },
      {
        step_number: 2,
        prompt: "What is the derivative?",
        options: ["$-8x$", "$-4x$", "$-8x^2$"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "$-4x$": "forgets to reduce the exponent",
          "$-8x^2$": "forgets to reduce the exponent after multiplying by 2",
        },
      },
    ],
  },
  {
    itemId: "guest-step-trace-one-sided-01",
    nodeSlug: "one-sided-limits",
    unitNumber: 1,
    unitName: "Limits and Continuity",
    nodeName: "One sided limits",
    prompt:
      "For $f(x) = \\begin{cases} x + 1 & x < 2 \\\\ 5 & x = 2 \\\\ 9 - x & x > 2 \\end{cases}$, find $\\lim_{x \\to 2^-} f(x)$.",
    stepSequence: [
      {
        step_number: 1,
        prompt: "Which piece of the graph applies as $x \\to 2$ from the left?",
        options: ["$x + 1$", "$5$", "$9 - x$"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "$5$": "uses the defined point value instead of the nearby branch",
          "$9 - x$": "uses the right hand branch for a left hand limit",
        },
      },
      {
        step_number: 2,
        prompt: "Evaluate the left hand limit.",
        options: ["$3$", "$5$", "$7$"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "$5$": "reports the function value at the point",
          "$7$": "evaluates the wrong branch",
        },
      },
    ],
  },
  {
    itemId: "guest-step-trace-implicit-01",
    nodeSlug: "implicit-differentiation-basics",
    unitNumber: 3,
    unitName: "Differentiation Composite Implicit Inverse",
    nodeName: "Implicit differentiation basics",
    prompt: "If $x^2 + y^2 = 25$, find $\\frac{dy}{dx}$ at the point where $x = 3$ and $y > 0$.",
    stepSequence: [
      {
        step_number: 1,
        prompt: "Differentiate both sides with respect to $x$. What is $\\frac{d}{dx}(y^2)$?",
        options: ["$2y\\frac{dy}{dx}$", "$2y$", "$2x$"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "$2y$": "forgets the chain rule on $y$",
          "$2x$": "differentiates $y^2$ as if $y$ were $x$",
        },
      },
      {
        step_number: 2,
        prompt: "Solve for $\\frac{dy}{dx}$ when $x = 3$ and $y = 4$.",
        options: ["$-\\frac{3}{4}$", "$\\frac{3}{4}$", "$-\\frac{4}{3}$"],
        correct_option_index: 0,
        misconception_tag_per_wrong_option: {
          "$\\frac{3}{4}$": "sign error isolating $\\frac{dy}{dx}$",
          "$-\\frac{4}{3}$": "inverts the slope ratio",
        },
      },
    ],
  },
];

function assertBankValid(entries: GuestStepTraceBankEntry[]): GuestStepTraceBankEntry[] {
  for (const entry of entries) {
    const parsed = parseStepTraceSequence(entry.stepSequence);
    if (!parsed) {
      throw new Error(`Invalid guest step trace bank entry: ${entry.itemId}`);
    }
  }
  return entries;
}

export const GUEST_STEP_TRACE_BANK = assertBankValid(RAW_BANK);

function pickOne<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? null;
}

export function pickGuestStepTraceBankEntry(): GuestStepTraceBankEntry | null {
  return pickOne(GUEST_STEP_TRACE_BANK);
}

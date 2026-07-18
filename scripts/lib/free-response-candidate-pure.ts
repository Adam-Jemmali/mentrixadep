import { expressionParses } from "../../src/features/free-response/symbolic-grade-pure";
import {
  parsePartialCreditRules,
  parseSolutionSteps,
} from "../../src/features/quest/components/step-feedback-pure";

export type FreeResponseCandidate = {
  prompt: string;
  answer_expression: string;
  answer_alternatives: string[];
  explanation: string;
  difficulty_rating: number;
  solution_steps: Array<{
    step_number: number;
    description: string;
    expression: string;
    misconception_if_skipped: string;
    is_critical: boolean;
  }>;
  partial_credit_rules: Array<{
    expression_pattern: string;
    credit_fraction: number;
    label: string;
  }>;
  authoring_meta?: {
    skill_verb: string;
    transfer_tag: string;
    proof_artifact: string;
    misconception_kit: string[];
  };
};

export function validateFreeResponseCandidate(candidate: FreeResponseCandidate): string | null {
  if (!candidate.prompt.trim() || candidate.prompt.trim().length < 28) {
    return "prompt too short for exceptional stem bar";
  }
  if (!candidate.answer_expression.trim()) {
    return "answer_expression required";
  }
  if (!expressionParses(candidate.answer_expression)) {
    return "answer_expression does not parse";
  }

  const difficulty = Number(candidate.difficulty_rating ?? 1000);
  if (!Number.isFinite(difficulty) || difficulty < 500 || difficulty > 2000) {
    return "difficulty_rating must be between 500 and 2000";
  }

  const steps = parseSolutionSteps(candidate.solution_steps);
  if (steps.length < 2) return "need at least 2 solution_steps";
  if (!steps.some((step) => step.is_critical)) {
    return "at least one solution_step must be is_critical";
  }

  for (const step of steps) {
    if (step.expression && !expressionParses(step.expression)) {
      return `solution_steps expression does not parse: ${step.expression}`;
    }
  }

  const rules = parsePartialCreditRules(candidate.partial_credit_rules);
  for (const rule of rules) {
    if (![0.25, 0.5, 0.75].includes(rule.credit_fraction)) {
      return "partial_credit_rules credit_fraction must be 0.25, 0.5, or 0.75";
    }
  }

  const meta = candidate.authoring_meta;
  if (!meta?.skill_verb?.trim() || !meta.transfer_tag?.trim() || !meta.proof_artifact?.trim()) {
    return "authoring_meta needs skill_verb, transfer_tag, proof_artifact";
  }
  if (!Array.isArray(meta.misconception_kit) || meta.misconception_kit.length < 3) {
    return "authoring_meta.misconception_kit needs ≥3 traps";
  }

  return null;
}

export function buildFreeResponseGenerationPrompt(input: {
  nodeName: string;
  description: string;
  misconceptions: string[];
}): string {
  const misconceptionLines =
    input.misconceptions.length > 0
      ? input.misconceptions.map((entry, index) => `${index + 1}. ${entry}`).join("\n")
      : "None listed. Invent one plausible AP Calculus AB misconception.";

  return `You are authoring one offline AP Calculus AB free_response item for human review.
Nothing you write is student visible until an admin approves it.

Skill node: ${input.nodeName}
Description: ${input.description}
Known misconceptions:
${misconceptionLines}

Requirements:
- Exceptional stem: every word earns its place (constraint, unit, trap). Min ~28 characters of substance.
- Constructed answer, not multiple choice
- If the stem names f(x)=..., the prompt must make that function graphable (human review will attach stimulus)
- answer_expression must be SymPy/mathjs parseable (use * for multiply, ** or ^ for powers)
- Include 2 to 4 answer_alternatives that are equivalent notations
- solution_steps: 2 to 5 ordered steps with description, expression, misconception_if_skipped, is_critical
- Exactly one or more steps with is_critical true
- partial_credit_rules: 0 to 2 rules with credit_fraction in {0.25, 0.5, 0.75}
- difficulty_rating integer between 500 and 2000 (default 1000)
- explanation: 2 to 3 sentences
- authoring_meta: skill_verb (compute|interpret|construct|justify|model), transfer_tag, proof_artifact, misconception_kit (≥3 tags)

Return ONLY valid JSON:
{
  "prompt": "...",
  "answer_expression": "3*x**2",
  "answer_alternatives": ["3x^2", "3*x^2"],
  "explanation": "...",
  "difficulty_rating": 1000,
  "authoring_meta": {
    "skill_verb": "compute",
    "transfer_tag": "related rates / net change intuition",
    "proof_artifact": "Can construct the derivative of a polynomial under VFA.",
    "misconception_kit": ["forgot_chain_rule", "dropped_constant", "power_rule_off_by_one"]
  },
  "solution_steps": [
    {
      "step_number": 1,
      "description": "...",
      "expression": "...",
      "misconception_if_skipped": "...",
      "is_critical": true
    }
  ],
  "partial_credit_rules": [
    {
      "expression_pattern": "x**2",
      "credit_fraction": 0.5,
      "label": "Power only"
    }
  ]
}`;
}

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
};

export function validateFreeResponseCandidate(candidate: FreeResponseCandidate): string | null {
  if (!candidate.prompt.trim() || candidate.prompt.trim().length < 10) {
    return "prompt too short";
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
- Constructed answer, not multiple choice
- answer_expression must be SymPy/mathjs parseable (use * for multiply, ** or ^ for powers)
- Include 2 to 4 answer_alternatives that are equivalent notations
- solution_steps: 2 to 5 ordered steps with description, expression, misconception_if_skipped, is_critical
- Exactly one or more steps with is_critical true
- partial_credit_rules: 0 to 2 rules with credit_fraction in {0.25, 0.5, 0.75}
- difficulty_rating integer between 500 and 2000 (default 1000)
- explanation: 2 to 3 sentences

Return ONLY valid JSON:
{
  "prompt": "...",
  "answer_expression": "3*x**2",
  "answer_alternatives": ["3x^2", "3*x^2"],
  "explanation": "...",
  "difficulty_rating": 1000,
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

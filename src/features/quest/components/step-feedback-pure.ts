export type SolutionStep = {
  step_number: number;
  description: string;
  expression: string;
  misconception_if_skipped: string;
  is_critical: boolean;
};

export type PartialCreditRule = {
  expression_pattern: string;
  credit_fraction: number;
  label: string;
};

export type ExpressionPart = {
  text: string;
  highlight: boolean;
};

export type StepFeedbackPartial = {
  label: string;
  creditFraction: number;
  rightSummary: string;
  missingSummary: string;
};

export type StepFeedbackOutcome = "correct" | "incorrect" | "partial";

export function parseSolutionSteps(raw: unknown): SolutionStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: SolutionStep[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const description = String(record.description ?? "").trim();
    const expression = String(record.expression ?? "").trim();
    if (!description && !expression) continue;
    steps.push({
      step_number: Number(record.step_number ?? steps.length + 1),
      description: description || "Step",
      expression,
      misconception_if_skipped: String(record.misconception_if_skipped ?? "").trim(),
      is_critical: Boolean(record.is_critical),
    });
  }
  return steps.sort((a, b) => a.step_number - b.step_number);
}

export function parsePartialCreditRules(raw: unknown): PartialCreditRule[] {
  if (!Array.isArray(raw)) return [];
  const rules: PartialCreditRule[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const label = String(record.label ?? "").trim();
    const pattern = String(record.expression_pattern ?? "").trim();
    if (!label && !pattern) continue;
    rules.push({
      expression_pattern: pattern,
      credit_fraction: Number(record.credit_fraction ?? 0),
      label: label || "Partial credit",
    });
  }
  return rules.sort((a, b) => b.credit_fraction - a.credit_fraction);
}

export function normalizeExpressionText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\\\(|\\\)|\\\[/g, "")
    .replace(/\$/g, "")
    .replace(/\s+/g, "")
    .replace(/\*\*/g, "^");
}

export function tokenizeExpression(value: string): string[] {
  const normalized = value.trim();
  if (!normalized) return [];
  return normalized
    .split(/(\s+|[=+\-*/^(),]|\\cdot)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function diffExpressionParts(student: string, correct: string): {
  studentParts: ExpressionPart[];
  correctParts: ExpressionPart[];
  firstMismatchToken: string | null;
} {
  const studentTokens = tokenizeExpression(student);
  const correctTokens = tokenizeExpression(correct);
  const max = Math.max(studentTokens.length, correctTokens.length);
  let firstMismatchToken: string | null = null;

  const studentParts: ExpressionPart[] = [];
  const correctParts: ExpressionPart[] = [];

  for (let i = 0; i < max; i++) {
    const s = studentTokens[i] ?? "";
    const c = correctTokens[i] ?? "";
    const mismatch = s !== c;
    if (mismatch && !firstMismatchToken) {
      firstMismatchToken = s || c;
    }
    if (s) studentParts.push({ text: s, highlight: mismatch });
    if (c) correctParts.push({ text: c, highlight: mismatch });
  }

  if (studentParts.length === 0 && student.trim()) {
    studentParts.push({ text: student.trim(), highlight: student.trim() !== correct.trim() });
  }
  if (correctParts.length === 0 && correct.trim()) {
    correctParts.push({ text: correct.trim(), highlight: student.trim() !== correct.trim() });
  }

  return { studentParts, correctParts, firstMismatchToken };
}

export function expressionAligns(answer: string, stepExpression: string): boolean {
  const a = normalizeExpressionText(answer);
  const b = normalizeExpressionText(stepExpression);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const aTokens = new Set(tokenizeExpression(answer).map(normalizeExpressionText));
  const bTokens = tokenizeExpression(stepExpression).map(normalizeExpressionText).filter(Boolean);
  if (bTokens.length === 0) return false;
  const overlap = bTokens.filter((token) => aTokens.has(token)).length;
  return overlap / bTokens.length >= 0.6;
}

export function findDivergeStepIndex(
  steps: SolutionStep[],
  studentAnswer: string,
  correctAnswer: string,
): number {
  if (steps.length === 0) return 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const studentOk = expressionAligns(studentAnswer, step.expression);
    const correctOk = expressionAligns(correctAnswer, step.expression);
    if (!studentOk && correctOk) return i;
    if (!studentOk && step.is_critical) return i;
  }

  const critical = steps.findIndex((step) => step.is_critical);
  return critical >= 0 ? critical : 0;
}

export function matchPartialCredit(
  studentAnswer: string,
  rules: PartialCreditRule[],
  correctAnswer: string,
): StepFeedbackPartial | null {
  const student = normalizeExpressionText(studentAnswer);
  if (!student || rules.length === 0) return null;

  for (const rule of rules) {
    const pattern = normalizeExpressionText(rule.expression_pattern);
    if (!pattern) continue;
    if (student.includes(pattern) || pattern.includes(student)) {
      const pct = Math.round(rule.credit_fraction * 100);
      return {
        label: rule.label,
        creditFraction: rule.credit_fraction,
        rightSummary: `You matched the "${rule.label}" path (${pct}% credit).`,
        missingSummary: buildMissingSummary(studentAnswer, correctAnswer),
      };
    }
  }
  return null;
}

function buildMissingSummary(studentAnswer: string, correctAnswer: string): string {
  const diff = diffExpressionParts(studentAnswer, correctAnswer);
  if (diff.firstMismatchToken) {
    return `Still missing alignment from "${diff.firstMismatchToken}" onward to reach the full answer.`;
  }
  return "The full canonical answer was not reached.";
}

export function resolveCorrectAnswerExpression(
  correctAnswer: string,
  answerExpression: string | null | undefined,
  steps: SolutionStep[],
): string {
  const fromSteps = steps.length > 0 ? steps[steps.length - 1]!.expression : "";
  return (answerExpression?.trim() || correctAnswer.trim() || fromSteps).trim();
}

export function hasStepFeedbackTrace(steps: SolutionStep[]): boolean {
  return steps.length > 0;
}

export function stepFeedbackVerdict(outcome: StepFeedbackOutcome): string {
  switch (outcome) {
    case "correct":
      return "Your path matches the reviewed solution.";
    case "incorrect":
      return "Your reasoning broke before the verified path finished.";
    case "partial":
      return "Part of the path counts, but the full answer is not locked yet.";
  }
}

export function stepFeedbackNextAction(outcome: StepFeedbackOutcome): string {
  switch (outcome) {
    case "correct":
      return "Open the full path if you want to compare steps.";
    case "incorrect":
      return "Redo the highlighted step before moving on.";
    case "partial":
      return "Close the gap shown in the missing line.";
  }
}

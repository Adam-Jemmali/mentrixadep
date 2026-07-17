import { create, all, type FactoryFunctionMap, type MathJsInstance } from "mathjs";

export type GradingVariableConstraint = {
  min?: number;
  max?: number;
};

export type GradingVariables = Record<string, GradingVariableConstraint>;

export type SymbolicGradeRequest = {
  student_expression: string;
  correct_expression: string;
  variables: GradingVariables;
};

export type SymbolicGradeResult = {
  equivalent: boolean;
  method: "symbolic" | "numeric";
};

const TRANSCENDENTAL_PATTERN =
  /\b(sin|cos|tan|sec|csc|cot|asin|acos|atan|sinh|cosh|tanh|ln|log|log10|exp|sqrt)\b/i;

const NUMERIC_SAMPLE_COUNT = 5;

let mathInstance: MathJsInstance | null = null;

function getMath(): MathJsInstance {
  if (!mathInstance) {
    mathInstance = create(all as FactoryFunctionMap, {});
  }
  return mathInstance;
}

export function normalizeGradingExpression(expression: string): string {
  return expression
    .trim()
    .replace(/\*\*/g, "^")
    .replace(/\s+/g, " ");
}

export function hashGradingExpression(expression: string): string {
  const normalized = normalizeGradingExpression(expression);
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function hasTranscendental(expression: string): boolean {
  return TRANSCENDENTAL_PATTERN.test(expression);
}

function isZeroSymbolicValue(simplified: unknown, math: MathJsInstance): boolean {
  if (simplified == null) return false;

  const text = String(simplified).replace(/\s+/g, "");
  if (text === "0") return true;

  try {
    const value = math.evaluate(String(simplified));
    return typeof value === "number" && Number.isFinite(value) && Math.abs(value) < 1e-12;
  } catch {
    return false;
  }
}

function sampleScope(
  variables: GradingVariables,
  sampleIndex: number,
): Record<string, number> {
  const scope: Record<string, number> = {};
  const keys = Object.keys(variables);

  for (const name of keys) {
    const constraint = variables[name] ?? {};
    const min = constraint.min ?? -1;
    const max = constraint.max ?? 1;
    const span = max - min;
    const offset = (sampleIndex + 1) / (NUMERIC_SAMPLE_COUNT + 1);
    scope[name] = min + span * offset;
  }

  return scope;
}

function roundToSixDecimals(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function numericEquivalence(
  math: MathJsInstance,
  student: string,
  correct: string,
  variables: GradingVariables,
): boolean {
  const variableNames = Object.keys(variables);
  if (variableNames.length === 0) {
    try {
      const studentValue = roundToSixDecimals(math.evaluate(student));
      const correctValue = roundToSixDecimals(math.evaluate(correct));
      return studentValue === correctValue;
    } catch {
      return false;
    }
  }

  for (let i = 0; i < NUMERIC_SAMPLE_COUNT; i += 1) {
    const scope = sampleScope(variables, i);
    try {
      const studentValue = roundToSixDecimals(math.evaluate(student, scope));
      const correctValue = roundToSixDecimals(math.evaluate(correct, scope));
      if (studentValue !== correctValue) return false;
    } catch {
      return false;
    }
  }

  return true;
}

export function gradeExpressions(request: SymbolicGradeRequest): SymbolicGradeResult {
  const math = getMath();
  const student = normalizeGradingExpression(request.student_expression);
  const correct = normalizeGradingExpression(request.correct_expression);

  if (!student || !correct) {
    return { equivalent: false, method: "symbolic" };
  }

  if (student === correct) {
    return { equivalent: true, method: "symbolic" };
  }

  const transcendental =
    hasTranscendental(student) || hasTranscendental(correct);

  if (!transcendental) {
    try {
      const diff = math.simplify(`(${student})-(${correct})`);
      if (isZeroSymbolicValue(diff, math)) {
        return { equivalent: true, method: "symbolic" };
      }
      if (!String(diff).match(/[a-zA-Z]/)) {
        return { equivalent: false, method: "symbolic" };
      }
    } catch {
      // Fall through to numeric sampling when symbolic parse fails.
    }
  }

  const equivalent = numericEquivalence(math, student, correct, request.variables);
  return { equivalent, method: "numeric" };
}

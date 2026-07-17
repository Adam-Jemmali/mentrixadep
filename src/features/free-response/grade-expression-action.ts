"use server";

import { z } from "zod";
import { requireRole } from "@/shared/core/auth";
import { gradeStudentExpression } from "@/features/free-response/grade-student-expression";
import {
  buildCorrectMathFeedback,
  buildIncorrectMathFeedback,
  studentNotationToGradingExpression,
} from "@/features/quest/components/math-input-pure";

const gradingVariablesSchema = z.record(
  z.string(),
  z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }),
);

const gradeExpressionSchema = z.object({
  itemId: z.string().uuid(),
  studentExpression: z.string().trim().min(1).max(4000),
  correctExpression: z.string().trim().min(1).max(4000),
  variables: gradingVariablesSchema.optional(),
});

export type GradeExpressionActionInput = z.infer<typeof gradeExpressionSchema>;

export type GradeExpressionActionResult =
  | {
      equivalent: boolean;
      method: "symbolic" | "numeric";
      cached: boolean;
      verdict: string;
      nextAction: string;
    }
  | { error: string };

export async function gradeExpression(
  input: GradeExpressionActionInput,
): Promise<GradeExpressionActionResult> {
  const user = await requireRole(["student", "admin"]);
  const parsed = gradeExpressionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid expression submission." };
  }

  try {
    const result = await gradeStudentExpression({
      userId: user.id,
      itemId: parsed.data.itemId,
      studentExpression: studentNotationToGradingExpression(parsed.data.studentExpression),
      correctExpression: studentNotationToGradingExpression(parsed.data.correctExpression),
      variables: parsed.data.variables,
    });

    const equivalent = result.equivalent;
    return {
      equivalent,
      method: result.method,
      cached: result.cached,
      verdict: equivalent
        ? buildCorrectMathFeedback()
        : buildIncorrectMathFeedback(result.method),
      nextAction: equivalent
        ? "Continue to the next skill."
        : "Edit your expression above and submit again.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Grading failed.";
    return { error: message };
  }
}

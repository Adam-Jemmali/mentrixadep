"use server";

import { z } from "zod";
import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { gradeStudentExpression } from "@/features/free-response/grade-student-expression";
import { updateChallengeDifficultyFromFreeResponse } from "@/features/quest/challenge-difficulty";
import { DEFAULT_CHALLENGE_DIFFICULTY } from "@/features/quest/challenge-difficulty-pure";
import {
  buildCorrectMathFeedback,
  buildIncorrectMathFeedback,
  studentNotationToGradingExpression,
} from "@/features/quest/components/math-input-pure";
import {
  matchPartialCredit,
  parsePartialCreditRules,
} from "@/features/quest/components/step-feedback-pure";
import { recordVerifiedFirstAttemptFromGrading } from "@/features/quest/record-verified-first-attempts";

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

    let partialCreditFraction: number | null = null;
    try {
      const admin = createAdminClient();
      const { data: item } = await admin
        .from("item_bank")
        .select("skill_node_id, difficulty_rating, partial_credit_rules")
        .eq("id", parsed.data.itemId)
        .maybeSingle();

      if (!equivalent && item?.partial_credit_rules) {
        const rules = parsePartialCreditRules(item.partial_credit_rules);
        const partial = matchPartialCredit(
          parsed.data.studentExpression,
          rules,
          parsed.data.correctExpression,
        );
        partialCreditFraction = partial?.creditFraction ?? null;
      }

      if (item?.skill_node_id) {
        await recordVerifiedFirstAttemptFromGrading({
          userId: user.id,
          itemId: parsed.data.itemId,
          skillNodeId: item.skill_node_id,
          attemptFormat: "free_response",
          isCorrect: equivalent,
          partialCreditFraction,
        });

        await updateChallengeDifficultyFromFreeResponse({
          userId: user.id,
          skillNodeId: item.skill_node_id,
          itemDifficultyRating:
            item.difficulty_rating == null
              ? DEFAULT_CHALLENGE_DIFFICULTY
              : Number(item.difficulty_rating),
          correct: equivalent,
        });
      }
    } catch {
      /* non-critical — VFA and difficulty must not block grading */
    }

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

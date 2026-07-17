import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { checkSlidingWindowRateLimit } from "@/shared/core/security";
import {
  gradeExpressions,
  hashGradingExpression,
  type GradingVariables,
  type SymbolicGradeResult,
} from "@/features/free-response/symbolic-grade-pure";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export type GradeExpressionInput = {
  userId: string;
  itemId: string;
  studentExpression: string;
  correctExpression: string;
  variables?: GradingVariables;
};

export type GradeExpressionOutput = SymbolicGradeResult & {
  cached: boolean;
};

function symbolicGradeRateKey(userId: string, itemId: string): string {
  return `symbolic_grade:user:${userId}:item:${itemId}`.slice(0, 240);
}

async function readSymbolicGradingCache(
  studentHash: string,
  correctHash: string,
): Promise<boolean | null> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

  const { data, error } = await admin
    .from("symbolic_grading_cache")
    .select("result, computed_at")
    .eq("student_expr_hash", studentHash)
    .eq("correct_expr_hash", correctHash)
    .gte("computed_at", cutoff)
    .maybeSingle();

  if (error || !data) return null;
  return Boolean(data.result);
}

async function writeSymbolicGradingCache(
  studentHash: string,
  correctHash: string,
  result: boolean,
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("symbolic_grading_cache").upsert(
    {
      student_expr_hash: studentHash,
      correct_expr_hash: correctHash,
      result,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "student_expr_hash,correct_expr_hash" },
  );
}

async function invokeGradeExpressionEdge(
  studentExpression: string,
  correctExpression: string,
  variables: GradingVariables,
): Promise<SymbolicGradeResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.functions.invoke("grade-expression", {
    body: {
      student_expression: studentExpression,
      correct_expression: correctExpression,
      variables,
    },
  });

  if (error) {
    throw new Error(error.message || "Symbolic grading failed");
  }

  const payload = data as {
    ok?: boolean;
    equivalent?: boolean;
    method?: SymbolicGradeResult["method"];
    error?: string;
  };

  if (!payload?.ok || typeof payload.equivalent !== "boolean") {
    throw new Error(payload?.error || "Symbolic grading returned an invalid response");
  }

  return {
    equivalent: payload.equivalent,
    method: payload.method === "numeric" ? "numeric" : "symbolic",
  };
}

/**
 * Grade a student expression against the canonical answer.
 * Cache hits under 24h skip Edge Function compute.
 * Rate limit: 5 calls per student per minute per item (cache hits exempt).
 */
export async function gradeStudentExpression(
  input: GradeExpressionInput,
): Promise<GradeExpressionOutput> {
  const variables = input.variables ?? {};
  const studentHash = hashGradingExpression(input.studentExpression);
  const correctHash = hashGradingExpression(input.correctExpression);

  const cached = await readSymbolicGradingCache(studentHash, correctHash);
  if (cached != null) {
    return { equivalent: cached, method: "symbolic", cached: true };
  }

  const rate = await checkSlidingWindowRateLimit(
    symbolicGradeRateKey(input.userId, input.itemId),
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rate.allowed) {
    throw new Error("Grading rate limit reached. Wait a minute and try again.");
  }

  let result: SymbolicGradeResult;
  try {
    result = await invokeGradeExpressionEdge(
      input.studentExpression,
      input.correctExpression,
      variables,
    );
  } catch {
    // Local fallback when Edge Function is unavailable (dev / pre-deploy).
    result = gradeExpressions({
      student_expression: input.studentExpression,
      correct_expression: input.correctExpression,
      variables,
    });
  }

  await writeSymbolicGradingCache(studentHash, correctHash, result.equivalent);
  return { ...result, cached: false };
}

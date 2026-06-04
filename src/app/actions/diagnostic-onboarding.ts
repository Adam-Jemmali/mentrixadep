"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGeminiApiKey } from "@/lib/env";
import {
  captureUnexpectedError,
  reportGeminiRateLimited,
} from "@/lib/observability";
import {
  generateJson,
  isRetryableGeminiError,
  reportAiFailure,
} from "@/lib/ai";
import {
  buildDiagnosticPrompt,
  buildFallbackDiagnosticResult,
  diagnosticInputSchema,
  diagnosticResultSchema,
  formatDiagnosticPersistError,
  type DiagnosticInput,
  type DiagnosticOnboardingResult,
  type DiagnosticResult,
} from "@/lib/diagnostic-onboarding-plan";

async function persistDiagnosticProfile(
  userId: string,
  data: DiagnosticInput,
  result: DiagnosticResult
): Promise<void> {
  const supabase = createAdminClient();
  const row = {
    student_id: userId,
    subject: data.subject,
    goal: data.goal,
    timeline: data.timeline,
    self_rating: data.selfRating,
    weak_areas: data.weakAreas ?? null,
    hours_per_week: data.hoursPerWeek,
    preferred_style: data.preferredStyle,
    study_plan: result.studyPlan,
    first_practice_prompt: result.firstPracticePrompt,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("student_diagnostic_profiles")
    .upsert(row, { onConflict: "student_id" });

  if (!upsertError) return;

  const { data: existing } = await supabase
    .from("student_diagnostic_profiles")
    .select("id")
    .eq("student_id", userId)
    .maybeSingle();

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("student_diagnostic_profiles")
      .update(row)
      .eq("student_id", userId);
    if (!updateError) return;
    throw updateError;
  }

  const { error: insertError } = await supabase.from("student_diagnostic_profiles").insert(row);
  if (!insertError) return;

  throw upsertError ?? insertError;
}

async function generateDiagnosticWithAi(data: DiagnosticInput): Promise<DiagnosticResult> {
  const systemPrompt =
    "You are Mentrixa's learning advisor. Respond with valid JSON only, matching the requested schema.";
  const raw = await generateJson(systemPrompt, buildDiagnosticPrompt(data), 30_000);
  const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = diagnosticResultSchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) {
    throw new Error("AI returned an invalid study plan shape");
  }
  return parsed.data;
}

/** Whether the student has finished the diagnostic quiz (table may be missing before migration). */
export async function hasStudentCompletedDiagnostic(studentId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("student_diagnostic_profiles")
      .select("completed_at")
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") return false;
      captureUnexpectedError("diagnostic-onboarding-status", error, {
        code: error.code,
        message: error.message,
      });
      return false;
    }

    return Boolean(data?.completed_at);
  } catch (err) {
    captureUnexpectedError("diagnostic-onboarding-status", err);
    return false;
  }
}

export async function submitDiagnosticOnboarding(
  input: DiagnosticInput
): Promise<DiagnosticOnboardingResult> {
  const user = await requireRole("student");
  if (!user.id) {
    return { success: false, error: "Could not verify your account. Please sign in again." };
  }
  const studentId = user.id;

  const parsed = diagnosticInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input." };
  }
  const data = parsed.data;

  if (!getGeminiApiKey()) {
    try {
      const result = buildFallbackDiagnosticResult(data);
      await persistDiagnosticProfile(studentId, data, result);
      return { success: true, result, fromFallback: true };
    } catch (err) {
      captureUnexpectedError("diagnostic-onboarding-persist", err, persistErrorExtra(err));
      return { success: false, error: formatDiagnosticPersistError(err) };
    }
  }

  let result: DiagnosticResult;
  let fromFallback = false;

  try {
    result = await generateDiagnosticWithAi(data);
  } catch (err) {
    if (isRetryableGeminiError(err)) {
      reportGeminiRateLimited("diagnostic-onboarding", String(err));
    } else {
      reportAiFailure("diagnostic-onboarding", err);
    }
    result = buildFallbackDiagnosticResult(data);
    fromFallback = true;
  }

  try {
    await persistDiagnosticProfile(studentId, data, result);
    return { success: true, result, fromFallback: fromFallback || undefined };
  } catch (err) {
    captureUnexpectedError("diagnostic-onboarding-persist", err, persistErrorExtra(err));
    return { success: false, error: formatDiagnosticPersistError(err) };
  }
}

function persistErrorExtra(err: unknown): Record<string, string> | undefined {
  if (err && typeof err === "object") {
    const e = err as { code?: string; message?: string; details?: string };
    return {
      code: e.code ?? "",
      message: e.message ?? "",
      details: e.details ?? "",
    };
  }
  return undefined;
}

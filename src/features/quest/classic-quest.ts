"use server";

import { recordClanQuestCompletion } from "@/features/clans/clan-events";
import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  generateExplanation,
  generateVariants,
  evaluateAnswer,
  type QuestExplanationResponse,
  type QuestVariant,
  type EvaluateAnswerResponse,
} from "@/shared/integrations/ai";
import { revalidatePath } from "next/cache";
import { trackEvent } from "@/shared/integrations/analytics";
import { applyXpAward } from "@/features/xp/xp-awards";
import { XP } from "@/features/xp/xp-constants";

import { getDivisionKeyForCourse } from "@/features/divisions/leaderboard";
import {
  buildQuestFallbackResponse,
  buildQuestFallbackVariants,
  fallbackEvaluateQuestAnswer,
  isQuestHardLimitMessage,
  normalizeQuestSolverErrorMessage,
  submitAnswerSchema,
  submitQuestSchema,
} from "@/features/quest/quest-internal";
import type { QuestGoal, QuestMode } from "@/features/quest/quest-internal";

export type { QuestGoal, QuestMode };

export interface SubmitQuestResult {
  questId: string;
  hints: string[];
  reasoning: string;
  solution: string;
  mode: QuestMode;
}

export interface SubmitQuestError {
  error: true;
  message: string;
}

export async function submitQuest(
  prompt: string,
  goal: QuestGoal,
  mode: QuestMode
): Promise<SubmitQuestResult | SubmitQuestError> {
  try {
    const validated = submitQuestSchema.parse({ prompt, goal, mode });
    const user = await requireRole(["student", "admin"]);
    const generated = await generateExplanation(
      { prompt: validated.prompt, goal: validated.goal, mode: validated.mode },
      user.id
    );

    let result: QuestExplanationResponse;
    if ("error" in generated && generated.error) {
      if (isQuestHardLimitMessage(generated.message)) {
        return { error: true, message: normalizeQuestSolverErrorMessage(generated.message) };
      }
      result = buildQuestFallbackResponse(validated.prompt, validated.goal, validated.mode);
    } else {
      result = generated as QuestExplanationResponse;
    }

    const { hints, reasoning, finalAnswer } = result;

    if (!hints.length) {
      return {
        error: true,
        message:
          "Quest did not return hints for this problem. Try rephrasing, shortening your question, or try again in a moment.",
      };
    }
    if (!finalAnswer?.trim()) {
      return {
        error: true,
        message:
          "Quest did not return a gradable answer. Try again, or split your question into a smaller part.",
      };
    }

    const supabase = await createClient();

    const { data: quest, error: questError } = await supabase
      .from("quests")
      .insert({
        creator_user_id: user.id,
        prompt: prompt.trim(),
        solution: finalAnswer, // Always store for grading (exam mode: not shown to user)
        metadata: { goal, mode, hintsCount: hints.length },
      })
      .select("id")
      .single();

    if (questError || !quest) {
      const reason = questError?.message ?? "Unknown error";
      return { error: true, message: `Failed to save quest: ${reason}` };
    }

    await supabase.from("user_quest_progress").upsert(
      {
        user_id: user.id,
        quest_id: quest.id,
        status: "in_progress",
        mode,
        num_attempts: 0,
      },
      { onConflict: "user_id,quest_id" }
    );

    void trackEvent("quest_started", {
      userId: user.id,
      properties: { mode, subject: prompt.slice(0, 60) },
    });

    revalidatePath("/student");
    return {
      questId: quest.id,
      hints,
      reasoning,
      solution: mode === "exam" ? "" : finalAnswer, // Don't expose solution in exam mode
      mode,
    };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return {
      error: true,
      message: normalizeQuestSolverErrorMessage(err),
    };
  }
}

/** Generate similar problems for the given prompt. */
export async function generateQuestVariants(
  prompt: string
): Promise<{ prompt: string; metadata: Record<string, unknown> }[] | { error: true; message: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const result = await generateVariants(prompt.trim(), user.id);
    if ("error" in result && result.error) {
      if (isQuestHardLimitMessage(result.message)) {
        return { error: true, message: result.message };
      }
      return buildQuestFallbackVariants(prompt.trim()).map((v) => ({
        prompt: v.prompt,
        metadata: v.metadata ?? {},
      }));
    }
    const variants = result as QuestVariant[];
    return variants.map((v) => ({ prompt: v.prompt, metadata: v.metadata }));
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return buildQuestFallbackVariants(prompt.trim()).map((v) => ({
      prompt: v.prompt,
      metadata: v.metadata ?? {},
    }));
  }
}

export interface SubmitQuestAnswerResult {
  correct: boolean;
  feedback?: string;
  xpAwarded?: number;
  totalXp?: number;
  streakDays?: number;
}

/** Submit user's answer for grading. If correct, quest complete + XP awarded. */
export async function submitQuestAnswer(
  questId: string,
  userAnswer: string,
  goal: QuestGoal,
  mode: QuestMode
): Promise<SubmitQuestAnswerResult | { error: true; message: string }> {
  try {
    const validated = submitAnswerSchema.parse({ questId, userAnswer, goal, mode });
    const user = await requireRole(["student", "admin"]);

    const adminClient = createAdminClient();
    const { data: quest, error: questError } = await adminClient
      .from("quests")
      .select("prompt, solution")
      .eq("id", validated.questId)
      .single();

    if (questError || !quest?.solution?.trim()) {
      return { error: true, message: "Quest not found or solution unavailable for grading." };
    }

    const supabase = await createClient();
    const { data: progress } = await supabase
      .from("user_quest_progress")
      .select("status")
      .eq("user_id", user.id)
      .eq("quest_id", validated.questId)
      .maybeSingle();

    if (progress?.status === "completed") {
      return {
        error: true,
        message:
          "You already finished this quest. Open it from Recents to review only, or use “Same question, new attempt” for a fresh run and XP.",
      };
    }

    const evalResult = await evaluateAnswer(
      {
        problem: quest.prompt,
        correctAnswer: quest.solution,
        userAnswer: validated.userAnswer,
        goal: validated.goal,
        mode: validated.mode,
      },
      user.id
    );

    let graded: EvaluateAnswerResponse;
    if ("error" in evalResult && evalResult.error) {
      if (isQuestHardLimitMessage(evalResult.message)) {
        return { error: true, message: evalResult.message };
      }
      const fallback = fallbackEvaluateQuestAnswer(validated.userAnswer, quest.solution);
      graded = {
        correct: fallback.correct,
        feedback: fallback.feedback,
      };
    } else {
      graded = evalResult as EvaluateAnswerResponse;
    }

    if (!graded.correct) {
      return {
        correct: false,
        feedback: graded.feedback ?? "Not quite right. Review the hints and try again.",
      };
    }

    const recordResult = await recordQuestAttempt(validated.questId, true, { awardXp: true });
    if ("error" in recordResult) {
      return { error: true, message: recordResult.message };
    }

    return {
      correct: true,
      feedback: graded.feedback,
      xpAwarded: recordResult.xpAwarded,
      totalXp: recordResult.totalXp,
      streakDays: recordResult.streakDays,
    };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return {
      error: true,
      message: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
}

export interface RecordQuestAttemptResult {
  xpAwarded: number;
  totalXp: number;
  streakDays: number;
}

/** Internal only: Record success or failure for the current quest. */
async function recordQuestAttempt(
  questId: string,
  success: boolean,
  options?: { awardXp?: boolean }
): Promise<RecordQuestAttemptResult | { error: true; message: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const supabase = await createClient();

    // Mark quest progress as completed
    const { error: progressError } = await supabase
      .from("user_quest_progress")
      .update({
        status: "completed",
        num_attempts: 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("quest_id", questId);

    if (progressError) {
      return { error: true, message: "Failed to update progress." };
    }

    let xpAwarded = 0;
    const adminClient = createAdminClient();

    // Only award XP when explicitly requested (e.g. from verified flows like proof-check). Do NOT award for "Solved it" / "Still confused" — unverified, easily cheated.
    if (options?.awardXp) {
      const { data: quest } = await adminClient
        .from("quests")
        .select("metadata")
        .eq("id", questId)
        .single();

      const meta = quest?.metadata as Record<string, unknown> | null;
      const course = typeof meta?.course === "string" ? meta.course : null;
      const divisionKey = course
        ? (await getDivisionKeyForCourse(course)) ?? "general"
        : "general";

      if (success) {
        xpAwarded = XP.QUEST_COMPLETE;
        await applyXpAward(
          user.id,
          XP.QUEST_COMPLETE,
          `quest_complete:${questId}`,
          divisionKey ?? undefined,
        );
        await recordClanQuestCompletion(user.id);
      }
    }

    // Read back updated totals to return to client
    const { data: updated } = await adminClient
      .from("user_xp")
      .select("total_xp, streak_days")
      .eq("user_id", user.id)
      .single();

    if (success) {
      void trackEvent("quest_completed", { userId: user.id });
      // Track first quest completed
      try {
        const adminForCount = createAdminClient();
        const { count } = await adminForCount
          .from("user_quest_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "completed");
        if ((count ?? 0) <= 1) {
          void trackEvent("first_quest_completed", { userId: user.id });
        }
      } catch { /* non-critical */ }
    }

    revalidatePath("/student");
    revalidatePath("/student/division");
    return {
      xpAwarded,
      totalXp: updated?.total_xp ?? 0,
      streakDays: updated?.streak_days ?? 0,
    };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return {
      error: true,
      message: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
}
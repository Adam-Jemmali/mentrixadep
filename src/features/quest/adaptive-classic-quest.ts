"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { trackEvent } from "@/shared/integrations/analytics";
import type { QuestGoal, QuestMode } from "@/features/quest/quest-internal";
import type { AdaptiveWorldState } from "@/shared/integrations/ai/adaptive-quest";
import type { AdaptiveClassicMetadata } from "@/features/quest/adaptive-classic-quest-schemas";
import type { SubmitQuestAnswerResult } from "@/features/quest/quest-internal";
import { applyXpAward } from "@/features/xp/xp-awards";
import { XP } from "@/features/xp/xp-constants";
import { getDivisionKeyForCourse } from "@/features/divisions/leaderboard";
import { recordDivisionWarQuestContribution } from "@/features/division-wars/contributions";

export async function startAdaptiveClassicQuest(
  prompt: string,
  goal: QuestGoal,
  mode: QuestMode,
  subject: string
): Promise<{ questId: string } | { error: true; message: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const trimmed = prompt.trim();
    if (!trimmed) return { error: true, message: "Enter a problem to begin." };

    const supabase = await createClient();
    const metadata: AdaptiveClassicMetadata = {
      goal,
      mode,
      subject: subject.trim() || "General",
      adaptiveChallenge: true,
      worldState: null,
      feedbackHistory: [],
      initialPrompt: trimmed,
    };

    const { data: quest, error: questError } = await supabase
      .from("quests")
      .insert({
        creator_user_id: user.id,
        prompt: trimmed,
        solution: "adaptive_challenge",
        metadata,
      })
      .select("id")
      .single();

    if (questError || !quest) {
      return { error: true, message: questError?.message ?? "Failed to save quest." };
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
      properties: { mode, subject: subject.slice(0, 60), adaptive: true },
    });

    revalidatePath("/student");
    return { questId: quest.id };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return {
      error: true,
      message: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
}

export async function persistAdaptiveTurnState(
  questId: string,
  userId: string,
  feedback: string,
  worldState: AdaptiveWorldState
): Promise<void> {
  const admin = createAdminClient();
  const { data: quest } = await admin
    .from("quests")
    .select("metadata, creator_user_id")
    .eq("id", questId)
    .single();

  if (!quest || quest.creator_user_id !== userId) return;

  const meta = (quest.metadata ?? {}) as Partial<AdaptiveClassicMetadata>;
  const history = Array.isArray(meta.feedbackHistory) ? [...meta.feedbackHistory] : [];
  history.push(feedback);

  await admin
    .from("quests")
    .update({
      metadata: {
        ...meta,
        adaptiveChallenge: true,
        worldState,
        feedbackHistory: history.slice(-40),
      },
    })
    .eq("id", questId);
}

export async function completeAdaptiveClassicQuest(
  questId: string
): Promise<SubmitQuestAnswerResult | { error: true; message: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: progress } = await supabase
      .from("user_quest_progress")
      .select("status")
      .eq("user_id", user.id)
      .eq("quest_id", questId)
      .maybeSingle();

    if (progress?.status === "completed") {
      return { error: true, message: "You already finished this adaptive challenge." };
    }

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

    const { data: quest } = await admin
      .from("quests")
      .select("metadata")
      .eq("id", questId)
      .single();

    const meta = quest?.metadata as Partial<AdaptiveClassicMetadata> | null;
    const subject = typeof meta?.subject === "string" ? meta.subject : null;
    const divisionKey = subject ? ((await getDivisionKeyForCourse(subject)) ?? "general") : "general";

    let xpAwarded = 0;
    const xpResult = await applyXpAward(
      user.id,
      XP.QUEST_COMPLETE,
      `quest_complete:${questId}`,
      divisionKey ?? undefined
    );
    if (xpResult.awarded) {
      xpAwarded = XP.QUEST_COMPLETE;
      void recordDivisionWarQuestContribution({
        studentId: user.id,
        divisionKey,
        correct: 1,
        total: 1,
      });
    }

    const { data: updated } = await admin
      .from("user_xp")
      .select("total_xp, streak_days")
      .eq("user_id", user.id)
      .single();

    void trackEvent("quest_completed", { userId: user.id });

    revalidatePath("/student");
    revalidatePath("/student/division");

    return {
      correct: true,
      feedback: "Adaptive challenge complete.",
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

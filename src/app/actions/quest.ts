"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateExplanation,
  generateVariants,
  evaluateAnswer,
  type QuestExplanationResponse,
  type QuestVariant,
  type EvaluateAnswerResponse,
} from "@/lib/ai";
import { revalidatePath } from "next/cache";
import type { UserXp } from "@/lib/database.types";
import { getLevelFromXp } from "@/lib/levels";

const XP_SUCCESS = 15;
const XP_ATTEMPT = 5;

export type QuestGoal = "exam" | "interview" | "assignment";
export type QuestMode = "coach" | "exam";

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

// ============================================================
// DIVISION HELPERS
// ============================================================

/**
 * Look up the division key for a free-text course name.
 * Returns null if no mapping exists (XP still awarded to total_xp).
 */
export async function getDivisionKeyForCourse(
  course: string
): Promise<string | null> {
  if (!course?.trim()) return null;
  try {
    const adminClient = createAdminClient();
    const { data: mapRow } = await adminClient
      .from("course_division_map")
      .select("division_id")
      .eq("course", course.trim())
      .maybeSingle();

    if (!mapRow?.division_id) return null;

    const { data: division } = await adminClient
      .from("divisions")
      .select("key")
      .eq("id", mapRow.division_id)
      .maybeSingle();

    return division?.key ?? null;
  } catch {
    return null; // best-effort — never block XP award
  }
}

/**
 * Award XP to a user, updating both total_xp and (optionally) division_xp.
 * Also manages streak_days and last_activity_date.
 *
 * @param userId       - The user receiving XP
 * @param amount       - XP amount to award
 * @param divisionKey  - Optional divisions.key to credit division XP
 */
export async function awardXp(
  userId: string,
  amount: number,
  divisionKey?: string
): Promise<void> {
  const adminClient = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await adminClient
    .from("user_xp")
    .select("total_xp, streak_days, last_activity_date, division_xp")
    .eq("user_id", userId)
    .single();

  const newTotal = (existing?.total_xp ?? 0) + amount;
  let newStreak = existing?.streak_days ?? 0;
  const lastDate = (existing?.last_activity_date as string | null) ?? null;

  if (lastDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    if (lastDate === yesterdayStr) newStreak += 1;
    else if (lastDate !== today) newStreak = 1;
    // if lastDate === today, streak stays the same
  } else {
    newStreak = 1;
  }

  // Build updated division_xp
  const currentDivXp = ((existing?.division_xp as Record<string, number>) ?? {});
  const newDivXp: Record<string, number> = { ...currentDivXp };
  if (divisionKey) {
    newDivXp[divisionKey] = (newDivXp[divisionKey] ?? 0) + amount;
  }

  if (existing) {
    await adminClient
      .from("user_xp")
      .update({
        total_xp: newTotal,
        streak_days: newStreak,
        last_activity_date: today,
        division_xp: newDivXp,
      })
      .eq("user_id", userId);
  } else {
    await adminClient.from("user_xp").insert({
      user_id: userId,
      total_xp: newTotal,
      streak_days: newStreak,
      last_activity_date: today,
      division_xp: newDivXp,
    });
  }
}

// ============================================================
// QUEST ACTIONS
// ============================================================

/** Submit problem, get AI explanation, persist quest and progress. */
export async function submitQuest(
  prompt: string,
  goal: QuestGoal,
  mode: QuestMode
): Promise<SubmitQuestResult | SubmitQuestError> {
  try {
    const user = await requireRole(["student", "admin"]);
    const result = await generateExplanation(
      { prompt: prompt.trim(), goal, mode },
      user.id
    );

    if ("error" in result && result.error) {
      return { error: true, message: result.message };
    }

    const { hints, reasoning, finalAnswer } = result as QuestExplanationResponse;

    if (!hints.length) {
      return {
        error: true,
        message:
          "The AI did not return hints for this problem. Try rephrasing, shortening your question, or try again in a moment.",
      };
    }
    if (!finalAnswer?.trim()) {
      return {
        error: true,
        message:
          "The AI did not return a gradable answer. Try again, or split your question into a smaller part.",
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
      message: err instanceof Error ? err.message : "Something went wrong.",
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
      return { error: true, message: result.message };
    }
    const variants = result as QuestVariant[];
    return variants.map((v) => ({ prompt: v.prompt, metadata: v.metadata }));
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return {
      error: true,
      message: err instanceof Error ? err.message : "Something went wrong.",
    };
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
    const user = await requireRole(["student", "admin"]);
    if (!userAnswer?.trim()) {
      return { error: true, message: "Please enter your answer." };
    }

    const adminClient = createAdminClient();
    const { data: quest, error: questError } = await adminClient
      .from("quests")
      .select("prompt, solution")
      .eq("id", questId)
      .single();

    if (questError || !quest?.solution?.trim()) {
      return { error: true, message: "Quest not found or solution unavailable for grading." };
    }

    const supabase = await createClient();
    const { data: progress } = await supabase
      .from("user_quest_progress")
      .select("status")
      .eq("user_id", user.id)
      .eq("quest_id", questId)
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
        userAnswer: userAnswer.trim(),
        goal,
        mode,
      },
      user.id
    );

    if ("error" in evalResult && evalResult.error) {
      return { error: true, message: evalResult.message };
    }

    const graded = evalResult as EvaluateAnswerResponse;

    if (!graded.correct) {
      return {
        correct: false,
        feedback: graded.feedback ?? "Not quite right. Review the hints and try again.",
      };
    }

    const recordResult = await recordQuestAttempt(questId, true, { awardXp: true });
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

/** Record success or failure for the current quest. Optionally award XP (disabled by default to prevent unverified "Solved it" cheating). */
export async function recordQuestAttempt(
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

      xpAwarded = success ? XP_SUCCESS : XP_ATTEMPT;
      await awardXp(user.id, xpAwarded, divisionKey ?? undefined);
    }

    // Read back updated totals to return to client
    const { data: updated } = await adminClient
      .from("user_xp")
      .select("total_xp, streak_days")
      .eq("user_id", user.id)
      .single();

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

export interface UserXpResult {
  totalXp: number;
  streakDays: number;
  divisionXp: Record<string, number>;
}

/** Fetch user_xp row for the given user. Requires student role. */
export async function getUserXp(userId: string): Promise<UserXp | null> {
  await requireRole(["student", "admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_xp")
    .select("user_id, total_xp, division_xp, streak_days, last_activity_date")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data as UserXp;
}

// ============================================================
// DIVISION LEADERBOARD & LEVELS
// ============================================================
// LEVEL_TIERS, LevelTier, LevelInfo, and getLevelFromXp are re-exported
// from @/lib/levels (see import at top of file).

export interface StudentDivisionResult {
  divisionKey: string;
  divisionName: string;
  divisionDescription: string | null;
  rank: number;
  divisionXp: number;
  level: ReturnType<typeof getLevelFromXp>;
  streakDays: number;
}

/** Active divisions catalog (for focus picker). */
export async function getActiveDivisions(): Promise<
  { key: string; name: string; description: string | null }[]
> {
  await requireRole(["student", "admin"]);
  return getDivisionsCatalog();
}

/** Public division list for pickers (e.g. tutor profile duel) — no auth required. */
export async function getDivisionsCatalog(): Promise<
  { key: string; name: string; description: string | null }[]
> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("divisions")
    .select("key, name, description")
    .eq("active", true)
    .order("name", { ascending: true });
  return (data ?? []).map((d) => ({
    key: d.key,
    name: d.name,
    description: d.description ?? null,
  }));
}

/**
 * Set which division leaderboard the student focuses (null = use highest-XP division).
 */
export async function setFocusedDivision(
  divisionKey: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const adminClient = createAdminClient();

    if (divisionKey !== null && divisionKey.trim() !== "") {
      const key = divisionKey.trim();
      const { data: div } = await adminClient
        .from("divisions")
        .select("key")
        .eq("key", key)
        .eq("active", true)
        .maybeSingle();
      if (!div) {
        return { success: false, error: "Unknown division." };
      }
      await adminClient.from("user_settings").upsert(
        {
          user_id: user.id,
          focused_division_key: key,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } else {
      await adminClient.from("user_settings").upsert(
        {
          user_id: user.id,
          focused_division_key: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    revalidatePath("/student/division");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save focus.",
    };
  }
}

/**
 * Leaderboard context: uses focused_division_key from settings when set and valid;
 * otherwise primary division = highest division_xp.
 * Returns null only when the learner has no division XP and no valid focus.
 */
export async function getStudentDivision(
  userId: string
): Promise<StudentDivisionResult | null> {
  await requireRole(["student", "admin"]);
  const adminClient = createAdminClient();

  const { data: settingsRow } = await adminClient
    .from("user_settings")
    .select("focused_division_key")
    .eq("user_id", userId)
    .maybeSingle();

  const focusedKey =
    typeof settingsRow?.focused_division_key === "string"
      ? settingsRow.focused_division_key.trim()
      : null;

  const { data: xpRow } = await adminClient
    .from("user_xp")
    .select("division_xp, streak_days")
    .eq("user_id", userId)
    .maybeSingle();

  const divisionXp = (xpRow?.division_xp as Record<string, number>) ?? {};
  const entries = Object.entries(divisionXp)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  let divisionKey: string;
  let xp: number;

  if (focusedKey) {
    const { data: focusDiv } = await adminClient
      .from("divisions")
      .select("key")
      .eq("key", focusedKey)
      .eq("active", true)
      .maybeSingle();

    if (focusDiv) {
      divisionKey = focusedKey;
      xp =
        typeof divisionXp[divisionKey] === "number"
          ? (divisionXp[divisionKey] ?? 0)
          : 0;
    } else if (entries.length === 0) {
      return null;
    } else {
      [divisionKey, xp] = entries[0] as [string, number];
    }
  } else if (entries.length > 0) {
    [divisionKey, xp] = entries[0] as [string, number];
  } else {
    return null;
  }

  const { data: division } = await adminClient
    .from("divisions")
    .select("key, name, description")
    .eq("key", divisionKey)
    .single();

  if (!division) return null;

  const { data: allRows } = await adminClient
    .from("user_xp")
    .select("user_id, division_xp");

  const allScores = (allRows ?? []).map((r) => ({
    xp: (r.division_xp as Record<string, number>)?.[divisionKey] ?? 0,
  }));
  const rank = allScores.filter((r) => r.xp > xp).length + 1;

  return {
    divisionKey: division.key,
    divisionName: division.name,
    divisionDescription: division.description ?? null,
    rank,
    divisionXp: xp,
    level: getLevelFromXp(xp),
    streakDays: (xpRow?.streak_days as number) ?? 0,
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  divisionXp: number;
  streakDays: number;
  level: ReturnType<typeof getLevelFromXp>;
  isCurrentUser: boolean;
}

/** Top 20 in a division. Display name from Settings (user_settings.display_name), then auth metadata / email. */
export async function getDivisionLeaderboard(
  divisionKey: string,
  currentUserId: string
): Promise<LeaderboardEntry[]> {
  await requireRole(["student", "admin"]);
  const adminClient = createAdminClient();

  const { data: xpRows } = await adminClient
    .from("user_xp")
    .select("user_id, division_xp, streak_days");

  const divXpList = (xpRows ?? [])
    .map((r) => ({
      user_id: r.user_id,
      xp: (r.division_xp as Record<string, number>)?.[divisionKey] ?? 0,
      streak_days: (r.streak_days as number) ?? 0,
    }))
    .filter((r) => r.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 20);

  const userIds = divXpList.map((r) => r.user_id);

  const settingsNameByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: settingsRows } = await adminClient
      .from("user_settings")
      .select("user_id, display_name")
      .in("user_id", userIds);
    for (const s of settingsRows ?? []) {
      const raw = typeof s.display_name === "string" ? s.display_name.trim() : "";
      if (raw) settingsNameByUser.set(s.user_id, raw.slice(0, 100));
    }
  }

  const displayNames: Record<string, string> = {};
  await Promise.all(
    userIds.map(async (uid) => {
      const fromSettings = settingsNameByUser.get(uid);
      if (fromSettings) {
        displayNames[uid] = fromSettings;
        return;
      }
      try {
        const { data } = await adminClient.auth.admin.getUserById(uid);
        const u = data?.user;
        const fullName = (u?.user_metadata?.full_name as string) || (u?.user_metadata?.name as string);
        if (fullName && typeof fullName === "string") {
          const parts = fullName.trim().split(/\s+/);
          const first = parts[0];
          const last = parts[parts.length - 1];
          if (parts.length >= 2 && first && last) {
            displayNames[uid] = `${first} ${last.charAt(0)}.`;
          } else if (first) {
            displayNames[uid] = first.slice(0, 2) + ".";
          }
        } else if (u?.email) {
          const local = u.email.split("@")[0];
          displayNames[uid] = local ? `${local.slice(0, 3)}***` : "Anonymous";
        } else {
          displayNames[uid] = "Anonymous";
        }
      } catch {
        displayNames[uid] = "Anonymous";
      }
    })
  );

  return divXpList.map((r, i) => ({
    rank: i + 1,
    userId: r.user_id,
    displayName: displayNames[r.user_id] ?? "Anonymous",
    divisionXp: r.xp,
    streakDays: r.streak_days,
    level: getLevelFromXp(r.xp),
    isCurrentUser: r.user_id === currentUserId,
  }));
}

export interface DivisionStat {
  divisionKey: string;
  divisionName: string;
  xp: number;
  level: ReturnType<typeof getLevelFromXp>;
  rank: number;
}

/** All divisions the student has XP in, with level and rank per division. */
export async function getStudentDivisionStats(
  userId: string
): Promise<DivisionStat[]> {
  await requireRole(["student", "admin"]);
  const adminClient = createAdminClient();

  const { data: xpRow } = await adminClient
    .from("user_xp")
    .select("division_xp")
    .eq("user_id", userId)
    .single();

  const divisionXp = (xpRow?.division_xp as Record<string, number>) ?? {};
  const keys = Object.entries(divisionXp)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .map(([k]) => k);

  if (keys.length === 0) return [];

  const { data: divisions } = await adminClient
    .from("divisions")
    .select("key, name")
    .in("key", keys);

  const divMap = new Map((divisions ?? []).map((d) => [d.key, d.name]));

  const result: DivisionStat[] = [];
  for (const key of keys) {
    const xp = divisionXp[key] ?? 0;
    const { data: allRows } = await adminClient
      .from("user_xp")
      .select("user_id, division_xp");
    const withXp = (allRows ?? [])
      .map((r) => ((r.division_xp as Record<string, number>)?.[key] ?? 0))
      .filter((v) => v > 0);
    const rank = withXp.filter((v) => v > xp).length + 1;

    result.push({
      divisionKey: key,
      divisionName: divMap.get(key) ?? key,
      xp,
      level: getLevelFromXp(xp),
      rank,
    });
  }

  return result.sort((a, b) => b.xp - a.xp);
}

export interface QuestHistoryEntry {
  questId: string;
  promptPreview: string;
  completedAt: string;
  mode: QuestMode | null;
  goal: QuestGoal | null;
  divisionKey: string;
  divisionName: string;
  /** XP from a verified correct submit (same as quest success award). */
  xpAwarded: number;
}

/** Completed quests for the signed-in student (division derived from quest metadata course when mapped). */
export async function getStudentQuestHistory(limit = 40): Promise<QuestHistoryEntry[]> {
  const user = await requireRole(["student", "admin"]);
  const adminClient = createAdminClient();

  const { data: progress, error: progErr } = await adminClient
    .from("user_quest_progress")
    .select("quest_id, last_attempt_at, mode")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("last_attempt_at", { ascending: false })
    .limit(limit);

  if (progErr || !progress?.length) return [];

  const questIds = Array.from(new Set(progress.map((p) => p.quest_id)));
  const { data: quests, error: qErr } = await adminClient
    .from("quests")
    .select("id, prompt, metadata, created_at")
    .in("id", questIds);

  if (qErr || !quests?.length) return [];

  const questMap = new Map(quests.map((q) => [q.id, q]));

  const { data: divRows } = await adminClient.from("divisions").select("key, name").eq("active", true);
  const divNameByKey = new Map((divRows ?? []).map((d) => [d.key, d.name]));

  const courses = new Set<string>();
  for (const p of progress) {
    const q = questMap.get(p.quest_id);
    if (!q) continue;
    const m = q.metadata as Record<string, unknown> | null;
    if (typeof m?.course === "string" && m.course.trim()) courses.add(m.course.trim());
  }
  const courseToDivKey = new Map<string, string>();
  for (const c of Array.from(courses)) {
    courseToDivKey.set(c, (await getDivisionKeyForCourse(c)) ?? "general");
  }

  const entries: QuestHistoryEntry[] = [];
  for (const p of progress) {
    const q = questMap.get(p.quest_id);
    if (!q) continue;
    const m = (q.metadata as Record<string, unknown> | null) ?? {};
    const course = typeof m.course === "string" ? m.course.trim() : null;
    const divisionKey = course ? (courseToDivKey.get(course) ?? "general") : "general";
    const divisionName =
      divNameByKey.get(divisionKey) ?? (divisionKey === "general" ? "General" : divisionKey);

    const goalRaw = m.goal;
    const goal: QuestGoal | null =
      goalRaw === "exam" || goalRaw === "interview" || goalRaw === "assignment"
        ? goalRaw
        : null;
    const modeRow = (p.mode as QuestMode | null) ?? (m.mode as QuestMode | null);
    const mode: QuestMode | null =
      modeRow === "coach" || modeRow === "exam" ? modeRow : null;

    const prompt = typeof q.prompt === "string" ? q.prompt : "";
    const preview =
      prompt.length > 160 ? `${prompt.slice(0, 160).trim()}…` : prompt;

    const completedAt =
      (typeof p.last_attempt_at === "string" && p.last_attempt_at) ||
      (typeof q.created_at === "string" && q.created_at) ||
      new Date().toISOString();

    entries.push({
      questId: q.id,
      promptPreview: preview || "(No prompt text)",
      completedAt,
      mode,
      goal,
      divisionKey,
      divisionName,
      xpAwarded: XP_SUCCESS,
    });
  }

  return entries;
}

/** Get current user XP and streak for the quest page footer. */
export async function getCurrentUserXp(): Promise<UserXpResult | { error: true; message: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_xp")
      .select("total_xp, streak_days, division_xp")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return { error: true, message: "Failed to load XP." };
    }

    const divisionXp = (data?.division_xp as Record<string, number>) ?? {};
    return {
      totalXp: data?.total_xp ?? 0,
      streakDays: data?.streak_days ?? 0,
      divisionXp,
    };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return {
      error: true,
      message: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
}

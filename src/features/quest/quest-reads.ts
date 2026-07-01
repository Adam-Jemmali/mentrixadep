"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { UserXp } from "@/shared/types/database";
import { XP } from "@/features/xp/xp-constants";
import { getDivisionKeyForCourse } from "@/features/divisions/leaderboard";
import { AP_CALC_AB_DIVISION_KEY } from "@/features/divisions/ap-calc-ab-division";
import type { QuestGoal, QuestMode } from "@/features/quest/quest-internal";

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
    .select("user_id, total_xp, division_xp, streak_days, last_activity_date, last_activity_at")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data as UserXp;
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
    courseToDivKey.set(c, (await getDivisionKeyForCourse(c)) ?? AP_CALC_AB_DIVISION_KEY);
  }

  const entries: QuestHistoryEntry[] = [];
  for (const p of progress) {
    const q = questMap.get(p.quest_id);
    if (!q) continue;
    const m = (q.metadata as Record<string, unknown> | null) ?? {};
    const course = typeof m.course === "string" ? m.course.trim() : null;
    const divisionKey = course ? (courseToDivKey.get(course) ?? AP_CALC_AB_DIVISION_KEY) : AP_CALC_AB_DIVISION_KEY;
    const divisionName =
      divNameByKey.get(divisionKey) ?? AP_CALC_AB_DIVISION_KEY.replace(/-/g, " ");

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
      xpAwarded: XP.QUEST_COMPLETE,
    });
  }

  return entries;
}

/** In-progress quest for learner dashboard "Continue" card. */
export async function getInProgressQuestPreview(): Promise<{
  questId: string;
  promptPreview: string;
  progressPercent: number;
} | null> {
  const user = await requireRole(["student", "admin"]);
  const adminClient = createAdminClient();

  const { data: progressRows } = await adminClient
    .from("user_quest_progress")
    .select("quest_id, num_attempts, last_attempt_at")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("last_attempt_at", { ascending: false })
    .limit(20);

  if (!progressRows?.length) return null;

  const questIds = Array.from(
    new Set(progressRows.map((row) => row.quest_id).filter((id): id is string => typeof id === "string" && id.length > 0)),
  );
  if (!questIds.length) return null;

  const { data: questRows } = await adminClient
    .from("quests")
    .select("id, prompt, created_at, metadata")
    .in("id", questIds);
  if (!questRows?.length) return null;

  const questById = new Map(questRows.map((q) => [q.id, q]));
  const candidates = progressRows
    .map((row) => {
      const quest = questById.get(row.quest_id);
      if (!quest) return null;
      const metadata = (quest.metadata as Record<string, unknown> | null) ?? {};
      const isCompletedPracticePack =
        metadata.questKind === "practice_pack" &&
        !!metadata.result &&
        typeof metadata.result === "object";
      if (metadata.questKind === "practice_pack" || isCompletedPracticePack) return null;
      const activityIso =
        (typeof row.last_attempt_at === "string" && row.last_attempt_at) ||
        (typeof quest.created_at === "string" && quest.created_at) ||
        "";
      const activityAt = activityIso ? new Date(activityIso).getTime() : 0;
      return {
        questId: row.quest_id,
        prompt: typeof quest.prompt === "string" ? quest.prompt : "",
        numAttempts: typeof row.num_attempts === "number" ? row.num_attempts : 0,
        activityAt,
      };
    })
    .filter((row): row is { questId: string; prompt: string; numAttempts: number; activityAt: number } => !!row)
    .sort((a, b) => b.activityAt - a.activityAt);

  const selected = candidates[0];
  if (!selected) return null;

  const preview =
    selected.prompt.length > 140
      ? `${selected.prompt.slice(0, 140).trim()}…`
      : selected.prompt || "Quest in progress";
  const n = selected.numAttempts;
  const progressPercent = Math.min(95, 20 + Math.min(n, 6) * 12);

  return {
    questId: selected.questId,
    promptPreview: preview,
    progressPercent,
  };
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

export interface QuestAccuracyTrend {
  subject: string;
  accuracyPercent: number;
  direction: "up" | "down" | "neutral" | null;
}

/**
 * Calculates student's average accuracy over their last 10 quests in their focused subject.
 * Compares the average of the last 5 vs. the previous 5 to determine trend direction.
 */
export async function getQuestAccuracyTrend(userId: string): Promise<QuestAccuracyTrend | null> {
  await requireRole(["student", "admin"]);
  const adminClient = createAdminClient();

  // 1. Resolve which subject/division to focus on
  const { data: settings } = await adminClient
    .from("user_settings")
    .select("focused_division_key")
    .eq("user_id", userId)
    .maybeSingle();

  let divisionKey = settings?.focused_division_key;
  if (!divisionKey) {
    const { data: xp } = await adminClient
      .from("user_xp")
      .select("division_xp")
      .eq("user_id", userId)
      .maybeSingle();
    const divXp = (xp?.division_xp as Record<string, number>) ?? {};
    const entries = Object.entries(divXp).sort((a, b) => b[1] - a[1]);
    divisionKey = entries[0]?.[0];
  }

  if (!divisionKey) return null;

  // Get human-readable division name
  const { data: division } = await adminClient
    .from("divisions")
    .select("name")
    .eq("key", divisionKey)
    .maybeSingle();
  const subjectName = division?.name?.replace(/ Division$/, "") ?? divisionKey;

  // 2. Fetch last 30 completed quests to find 10 matches for this division
  const { data: progressRows } = await adminClient
    .from("user_quest_progress")
    .select(`
      num_attempts,
      status,
      last_attempt_at,
      quests!inner (
        metadata
      )
    `)
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("last_attempt_at", { ascending: false })
    .limit(40);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!progressRows || (progressRows as any[]).length === 0) return null;

  const relevantQuests: { correct: number; total: number }[] = [];

  // 2.5 Optimization: Pre-fetch course mapping to avoid N+1 queries
  const { data: allMappings } = await adminClient
    .from("course_division_map")
    .select("course, divisions(key)");
  const courseToDiv = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (allMappings as any[])?.forEach((m) => {
    const key = m.divisions?.key || m.divisions?.[0]?.key;
    if (m.course && key) courseToDiv.set(m.course, key);
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (progressRows as any[])) {
    const questData = Array.isArray(row.quests) ? row.quests[0] : row.quests;
    if (!questData) continue;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = questData.metadata as any;
    const course = meta?.course || "";
    
    // Check if this quest belongs to the student's active division
    const questDivKey = course ? courseToDiv.get(course) || AP_CALC_AB_DIVISION_KEY : AP_CALC_AB_DIVISION_KEY;
    
    if (questDivKey === divisionKey) {
      let correct = 1;
      let total = row.num_attempts || 1;
      
      // If it's a practice pack, metadata contains specific correct/total
      if (meta?.result?.correct !== undefined) {
        correct = meta.result.correct;
        total = meta.result.total || row.num_attempts || 1;
      }
      
      relevantQuests.push({ correct, total });
    }
    if (relevantQuests.length >= 10) break;
  }

  if (relevantQuests.length === 0) return null;

  // 3. Calculate Overall Accuracy (Last 10)
  const last10 = relevantQuests.slice(0, 10);
  const totalCorrect = last10.reduce((acc, q) => acc + q.correct, 0);
  const totalQuestions = last10.reduce((acc, q) => acc + q.total, 0);
  
  if (totalQuestions === 0) return null;
  const accuracyPercent = Math.round((totalCorrect / totalQuestions) * 100);

  // 4. Calculate Trend (Last 5 vs Prev 5)
  let direction: "up" | "down" | "neutral" | null = null;
  if (relevantQuests.length >= 10) {
    const last5 = relevantQuests.slice(0, 5);
    const prev5 = relevantQuests.slice(5, 10);
    
    const last5Total = last5.reduce((acc, q) => acc + q.total, 0);
    const prev5Total = prev5.reduce((acc, q) => acc + q.total, 0);
    
    if (last5Total > 0 && prev5Total > 0) {
      const accLast5 = last5.reduce((acc, q) => acc + q.correct, 0) / last5Total;
      const accPrev5 = prev5.reduce((acc, q) => acc + q.correct, 0) / prev5Total;
      
      // ±1% threshold for "neutral"
      if (accLast5 > accPrev5 + 0.01) direction = "up";
      else if (accLast5 < accPrev5 - 0.01) direction = "down";
      else direction = "neutral";
    }
  }

  return {
    subject: subjectName,
    accuracyPercent,
    direction
  };
}

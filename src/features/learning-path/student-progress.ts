"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { captureUnexpectedError } from "@/shared/integrations/observability";

export interface ProgressSnapshot {
  totalSessions: number;
  completedSessions: number;
  totalXp: number;
  streakDays: number;
  divisionRanks: { division: string; xp: number; rank: number }[];
  questAccuracyWeekly: { week: string; accuracy: number; count: number }[];
  recentAchievements: string[];
  memberSince: string;
}

export async function getStudentProgressSnapshot(
  studentId?: string
): Promise<ProgressSnapshot | null> {
  const authUser = await requireRole(["student", "admin"]);
  const targetId =
    authUser.role === "admin" && studentId ? studentId : authUser.id;

  const admin = createAdminClient();

  try {
    const [sessionsResult, xpResult, questsResult, userResult] = await Promise.all([
      admin
        .from("sessions")
        .select("id, status, completed")
        .eq("student_id", targetId),
      admin
        .from("user_xp")
        .select("total_xp, division_xp, streak_days")
        .eq("user_id", targetId)
        .maybeSingle(),
      admin
        .from("user_quest_progress")
        .select("status, last_attempt_at")
        .eq("user_id", targetId)
        .order("last_attempt_at", { ascending: false })
        .limit(100),
      admin
        .from("users")
        .select("created_at")
        .eq("id", targetId)
        .single(),
    ]);

    const sessions = sessionsResult.data ?? [];
    const xp = xpResult.data;
    const quests = questsResult.data ?? [];
    const user = userResult.data;

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.completed || s.status === "completed"
    ).length;

    const divisionXp = (xp?.division_xp as Record<string, number>) ?? {};
    const divisionRanks = Object.entries(divisionXp)
      .sort(([, a], [, b]) => b - a)
      .map(([division, xpVal], i) => ({
        division,
        xp: xpVal,
        rank: i + 1,
      }));

    const weeklyMap = new Map<string, { correct: number; total: number }>();
    for (const q of quests) {
      if (!q.last_attempt_at) continue;
      const d = new Date(q.last_attempt_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      const entry = weeklyMap.get(weekKey) ?? { correct: 0, total: 0 };
      entry.total++;
      if (q.status === "correct") entry.correct++;
      weeklyMap.set(weekKey, entry);
    }

    const questAccuracyWeekly = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, { correct, total }]) => ({
        week,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        count: total,
      }));

    const achievements: string[] = [];
    if (completedSessions >= 1) achievements.push("First session completed");
    if (completedSessions >= 10) achievements.push("10 sessions milestone");
    if ((xp?.streak_days ?? 0) >= 7) achievements.push("7-day streak");
    if ((xp?.streak_days ?? 0) >= 30) achievements.push("30-day streak");
    if ((xp?.total_xp ?? 0) >= 1000) achievements.push("1,000 XP earned");
    if ((xp?.total_xp ?? 0) >= 5000) achievements.push("5,000 XP earned");
    if (quests.length >= 50) achievements.push("50 quests attempted");

    return {
      totalSessions,
      completedSessions,
      totalXp: xp?.total_xp ?? 0,
      streakDays: xp?.streak_days ?? 0,
      divisionRanks,
      questAccuracyWeekly,
      recentAchievements: achievements,
      memberSince: user?.created_at ?? "",
    };
  } catch (err) {
    captureUnexpectedError("student-progress-snapshot", err);
    return null;
  }
}

export async function generateShareableProgressUrl(
  studentId?: string
): Promise<string | null> {
  const authUser = await requireRole(["student", "admin"]);
  const targetId =
    authUser.role === "admin" && studentId ? studentId : authUser.id;
  const admin = createAdminClient();

  try {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await admin.from("progress_share_tokens").upsert(
      {
        student_id: targetId,
        token,
        expires_at: expiresAt,
      },
      { onConflict: "student_id" }
    );

    return `/student/progress/share/${token}`;
  } catch (err) {
    captureUnexpectedError("generate-shareable-progress", err);
    return null;
  }
}

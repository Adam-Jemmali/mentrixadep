import { rankFromTotalXp } from "@/features/rank-card/calculate-pure";
import { supabaseRestSelect } from "@/shared/integrations/supabase/rest-fetch";

export type OgRankCardData =
  | { status: "not_found" }
  | { status: "private"; username: string }
  | {
      status: "ok";
      username: string;
      displayName: string;
      globalRankLevel: number;
      globalRankTitle: string;
      subjectLine: string;
    };

type SettingsRow = {
  user_id: string;
  display_name: string | null;
  rank_card_public: boolean | null;
};

type UserRow = {
  role: string;
  approved: boolean | null;
};

type XpRow = {
  total_xp: number | null;
};

type QuestProgressRow = {
  num_attempts: number | null;
  quests: { metadata: Record<string, unknown> | null } | { metadata: Record<string, unknown> | null }[] | null;
};

function computeAccuracyPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

function topSubjectLineFromQuests(rows: QuestProgressRow[]): string | null {
  const byCourse = new Map<string, { correct: number; total: number }>();

  for (const row of rows) {
    const quest = Array.isArray(row.quests) ? row.quests[0] : row.quests;
    const meta = quest?.metadata;
    const course =
      typeof meta?.course === "string" && meta.course.trim() ? meta.course.trim() : "General";

    let correct = 1;
    let total = row.num_attempts || 1;
    const result = meta?.result as { correct?: number; total?: number } | undefined;
    if (result?.correct !== undefined) {
      correct = result.correct;
      total = result.total || row.num_attempts || 1;
    }

    const agg = byCourse.get(course) ?? { correct: 0, total: 0 };
    agg.correct += correct;
    agg.total += total;
    byCourse.set(course, agg);
  }

  let bestCourse: string | null = null;
  let bestAgg: { correct: number; total: number } | null = null;
  for (const [course, agg] of byCourse) {
    if (!bestAgg || agg.total > bestAgg.total) {
      bestCourse = course;
      bestAgg = agg;
    }
  }

  if (!bestCourse || !bestAgg || bestAgg.total <= 0) return null;
  return `${bestCourse} · ${computeAccuracyPercent(bestAgg.correct, bestAgg.total)}% accuracy`;
}

/** Edge-safe loader for OG images — avoids @supabase/supabase-js and full rank-card build. */
export async function loadOgRankCardData(rawUsername: string): Promise<OgRankCardData> {
  const username = rawUsername.trim().toLowerCase();
  if (!username) return { status: "not_found" };

  const settingsRows = await supabaseRestSelect<SettingsRow>(
    "user_settings",
    `rank_card_username=eq.${encodeURIComponent(username)}&select=user_id,display_name,rank_card_public&limit=1`,
  );

  const settings = settingsRows[0];
  if (!settings?.user_id) return { status: "not_found" };

  if (settings.rank_card_public === false) {
    return { status: "private", username };
  }

  const studentId = settings.user_id;

  const [userRows, xpRows, questRows] = await Promise.all([
    supabaseRestSelect<UserRow>(
      "users",
      `id=eq.${encodeURIComponent(studentId)}&select=role,approved&limit=1`,
    ),
    supabaseRestSelect<XpRow>(
      "user_xp",
      `user_id=eq.${encodeURIComponent(studentId)}&select=total_xp&limit=1`,
    ),
    supabaseRestSelect<QuestProgressRow>(
      "user_quest_progress",
      `user_id=eq.${encodeURIComponent(studentId)}&status=eq.completed&select=num_attempts,quests(metadata)&order=last_attempt_at.desc&limit=80`,
    ),
  ]);

  const user = userRows[0];
  if (!user || user.role !== "student" || !user.approved) {
    return { status: "not_found" };
  }

  const totalXp = xpRows[0]?.total_xp ?? 0;
  const globalRank = rankFromTotalXp(totalXp);
  const displayName =
    (typeof settings.display_name === "string" && settings.display_name.trim()
      ? settings.display_name.trim()
      : username) || "Mentrixer";

  const subjectLine = topSubjectLineFromQuests(questRows) ?? "Competitive arena record";

  return {
    status: "ok",
    username,
    displayName,
    globalRankLevel: globalRank.level,
    globalRankTitle: globalRank.title,
    subjectLine,
  };
}

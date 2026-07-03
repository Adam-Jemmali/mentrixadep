import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { StudentProfileAchievement } from "@/features/student-profile/student-profile-lib";
import {
  duelOutcomeForViewer,
  formatDuelBattleLogSummary,
  isApCalcDuelForBattleLog,
  isApCalcQuestForBattleLog,
  truncateBattleLogSummary,
} from "@/features/student-profile/battle-log-pure";

const BATTLE_LOG_LIMIT = 8;

type QuestProgressRow = {
  id: string;
  last_attempt_at: string | null;
  quests:
    | { prompt: string; metadata: Record<string, unknown> | null }
    | { prompt: string; metadata: Record<string, unknown> | null }[]
    | null;
};

type DuelRow = {
  id: string;
  student_id: string;
  opponent_student_id: string | null;
  division_key: string;
  winner: "student" | "opponent" | "tie" | null;
  is_ai_opponent: boolean;
  completed_at: string | null;
};

function resolveQuestJoin(
  quests: QuestProgressRow["quests"],
): { prompt: string; metadata: Record<string, unknown> | null } | null {
  if (!quests) return null;
  if (Array.isArray(quests)) return quests[0] ?? null;
  return quests;
}

export async function loadProfileBattleLog(studentId: string): Promise<StudentProfileAchievement[]> {
  const admin = createAdminClient();

  const [{ data: questRows }, { data: duelRows }] = await Promise.all([
    admin
      .from("user_quest_progress")
      .select("id, last_attempt_at, quests!inner(prompt, metadata)")
      .eq("user_id", studentId)
      .eq("status", "completed")
      .order("last_attempt_at", { ascending: false })
      .limit(40),
    admin
      .from("skill_duels")
      .select(
        "id, student_id, opponent_student_id, division_key, winner, is_ai_opponent, completed_at",
      )
      .or(`student_id.eq.${studentId},opponent_student_id.eq.${studentId}`)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);

  const entries: StudentProfileAchievement[] = [];

  for (const row of (questRows as QuestProgressRow[] | null) ?? []) {
    const quest = resolveQuestJoin(row.quests);
    if (!quest || !row.last_attempt_at) continue;
    if (!isApCalcQuestForBattleLog(quest.metadata, quest.prompt)) continue;
    entries.push({
      id: `quest:${row.id}`,
      completedAt: row.last_attempt_at,
      summary: truncateBattleLogSummary(quest.prompt || "Quest completed"),
    });
  }

  const duels = (duelRows as DuelRow[] | null) ?? [];
  const opponentIds = new Set<string>();
  for (const duel of duels) {
    if (!isApCalcDuelForBattleLog(duel.division_key)) continue;
    if (duel.opponent_student_id && duel.opponent_student_id !== studentId) {
      opponentIds.add(duel.opponent_student_id);
    }
    if (duel.student_id !== studentId) opponentIds.add(duel.student_id);
  }

  const nameById = new Map<string, string>();
  if (opponentIds.size > 0) {
    const { data: settings } = await admin
      .from("user_settings")
      .select("user_id, display_name")
      .in("user_id", Array.from(opponentIds));
    for (const row of settings ?? []) {
      const name =
        typeof row.display_name === "string" && row.display_name.trim()
          ? row.display_name.trim()
          : "Learner";
      nameById.set(row.user_id, name);
    }
  }

  for (const duel of duels) {
    if (!duel.completed_at || !isApCalcDuelForBattleLog(duel.division_key)) continue;
    const outcome = duelOutcomeForViewer({
      viewerId: studentId,
      studentId: duel.student_id,
      opponentStudentId: duel.opponent_student_id,
      winner: duel.winner,
    });
    if (!outcome) continue;

    const opponentLabel =
      duel.is_ai_opponent && duel.student_id === studentId
        ? "Sparring Quest"
        : duel.student_id === studentId
          ? nameById.get(duel.opponent_student_id ?? "") ?? "Learner"
          : nameById.get(duel.student_id) ?? "Learner";

    entries.push({
      id: `duel:${duel.id}`,
      completedAt: duel.completed_at,
      summary: formatDuelBattleLogSummary({ outcome, opponentLabel }),
    });
  }

  return entries
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, BATTLE_LOG_LIMIT);
}

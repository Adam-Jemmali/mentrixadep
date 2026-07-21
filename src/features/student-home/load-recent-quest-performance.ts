import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { PracticePackMetadata } from "@/features/quest/practice-quest-types";

export type RecentQuestPerformanceRow = {
  questId: string;
  completedAt: string;
  correct: number;
  total: number;
  perfect: boolean;
  subject: string;
};

export async function loadRecentQuestPerformance(
  userId: string,
  limit = 3,
): Promise<RecentQuestPerformanceRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quests")
    .select("id, created_at, metadata")
    .eq("creator_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return [];

  const rows: RecentQuestPerformanceRow[] = [];
  for (const quest of data ?? []) {
    const meta = quest.metadata as PracticePackMetadata | null;
    if (meta?.questKind !== "practice_pack" || !meta.result) continue;
    rows.push({
      questId: String(quest.id),
      completedAt: String(quest.created_at),
      correct: meta.result.correct,
      total: meta.result.total,
      perfect: meta.result.perfect,
      subject: meta.subject,
    });
    if (rows.length >= limit) break;
  }

  return rows;
}

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { SkillDuelQuestion } from "@/shared/types/database";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  DUEL_ITEM_BANK_UNAVAILABLE_MESSAGE,
  duelRowsToQuestionPack,
  filterDuelRowsToUnlockedNodes,
  pickDuelItemBankRows,
  type DuelItemBankRow,
} from "@/features/duels/duel-item-bank-pure";

type MatchSource = "direct" | "clan" | "queue";

type QueueStyleSource = "queue" | "ai_queue";

export function isQueueStyleMatchSource(ms: string | null): ms is QueueStyleSource {
  return ms === "queue" || ms === "ai_queue";
}

export type DuelReadyRow = {
  id: string;
  student_id: string;
  opponent_student_id: string | null;
  status: string;
  match_source: string | null;
  is_ai_opponent: boolean;
  student_ready_at: string | null;
  opponent_ready_at: string | null;
};

export function bothSidesReady(duel: DuelReadyRow): boolean {
  return Boolean(duel.student_ready_at && duel.opponent_ready_at);
}

export function randomAiOpponentAnswers(questions: SkillDuelQuestion[]): number[] {
  return questions.map((q) =>
    Math.floor(Math.random() * Math.max(1, q.choices.length))
  );
}

export async function loadApCalcAbSkillNodeIds(
  admin: ReturnType<typeof createAdminClient>,
): Promise<string[]> {
  const { data, error } = await admin
    .from("skill_nodes")
    .select("id")
    .eq("subject", AP_CALC_AB_SUBJECT);

  if (error || !data?.length) return [];
  return data.map((row) => row.id);
}

async function loadApprovedDuelItemBankRows(
  admin: ReturnType<typeof createAdminClient>,
  nodeIds: string[],
): Promise<DuelItemBankRow[]> {
  const pageSize = 1000;
  const out: DuelItemBankRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("item_bank")
      .select("id, skill_node_id, prompt, options, correct_answer")
      .eq("status", "approved")
      .in("skill_node_id", nodeIds)
      .range(from, from + pageSize - 1);
    if (error || !data?.length) break;
    out.push(...(data as DuelItemBankRow[]));
    if (data.length < pageSize) break;
  }
  return out;
}

/** Recent item_bank_ids from both duelists so rematches do not recycle the same stems. */
async function loadRecentDuelItemIds(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
  limitPerUser = 8,
): Promise<Set<string>> {
  const ids = new Set<string>();
  const uniqueUsers = [...new Set(userIds.filter(Boolean))];
  for (const userId of uniqueUsers) {
    const { data } = await admin
      .from("skill_duels")
      .select("item_bank_ids")
      .or(`student_id.eq.${userId},opponent_student_id.eq.${userId}`)
      .in("status", ["active", "completed"])
      .order("created_at", { ascending: false })
      .limit(limitPerUser);
    for (const row of data ?? []) {
      const bankIds = row.item_bank_ids;
      if (!Array.isArray(bankIds)) continue;
      for (const id of bankIds) {
        if (typeof id === "string" && id) ids.add(id);
      }
    }
  }
  return ids;
}

export async function selectDuelQuestions(
  duelId: string,
  nodeIds: string[],
): Promise<
  { questions: SkillDuelQuestion[]; itemBankIds: string[] } | { error: string }
> {
  const admin = createAdminClient();
  const allNodeIds = await loadApCalcAbSkillNodeIds(admin);
  if (!allNodeIds.length) {
    return { error: DUEL_ITEM_BANK_UNAVAILABLE_MESSAGE };
  }

  const requestedNodeIds = new Set(nodeIds);
  const candidateNodeIds = allNodeIds.filter((nodeId) => requestedNodeIds.has(nodeId));
  if (!candidateNodeIds.length) {
    return { error: DUEL_ITEM_BANK_UNAVAILABLE_MESSAGE };
  }
  const unlockedNodeIds = new Set(candidateNodeIds);

  const { data: duelMeta } = await admin
    .from("skill_duels")
    .select("student_id, opponent_student_id")
    .eq("id", duelId)
    .maybeSingle();

  const recentIds = await loadRecentDuelItemIds(admin, [
    duelMeta?.student_id ?? "",
    duelMeta?.opponent_student_id ?? "",
  ]);

  const items = await loadApprovedDuelItemBankRows(admin, allNodeIds);
  if (!items.length) {
    return { error: DUEL_ITEM_BANK_UNAVAILABLE_MESSAGE };
  }

  const unlockedItems = filterDuelRowsToUnlockedNodes(items, unlockedNodeIds);
  let picked = pickDuelItemBankRows(unlockedItems, unlockedNodeIds, undefined, undefined, {
    excludeIds: recentIds,
  });
  // If recent exclusion empties the pool, allow rematches of older stems.
  if (!picked.length) {
    picked = pickDuelItemBankRows(unlockedItems, unlockedNodeIds);
  }
  if (!picked.length) {
    return { error: DUEL_ITEM_BANK_UNAVAILABLE_MESSAGE };
  }

  const pack = duelRowsToQuestionPack(picked);
  if (!pack) {
    return { error: DUEL_ITEM_BANK_UNAVAILABLE_MESSAGE };
  }

  return pack;
}

export function scoreAnswers(
  questions: SkillDuelQuestion[],
  answers: number[] | null
): number {
  if (!answers || answers.length !== questions.length) return 0;
  let s = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const a = answers[i];
    if (q && typeof a === "number" && a >= 0 && a === q.correctIndex) s += 1;
  }
  return s;
}

export async function insertPendingSkillDuel(
  admin: ReturnType<typeof createAdminClient>,
  challengerId: string,
  opponentId: string,
  divisionKey: string,
  matchSource: MatchSource
): Promise<{ ok: true; duelId: string } | { ok: false; message: string }> {
  const { data: inserted, error: insErr } = await admin
    .from("skill_duels")
    .insert({
      student_id: challengerId,
      opponent_student_id: opponentId,
      initiator_id: challengerId,
      division_key: divisionKey,
      status: "pending",
      questions: [],
      item_bank_ids: [],
      reward_amount_cents: 0,
      match_source: matchSource,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return { ok: false, message: insErr?.message ?? "Could not create duel." };
  }
  return { ok: true, duelId: inserted.id };
}

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { PracticeQuestionMcq } from "@/features/quest/practice-quest-types";
import {
  BREAKTHROUGH_PACK_MIN_COUNT,
  BREAKTHROUGH_PACK_TARGET_COUNT,
  buildBreakthroughPackUnavailableMessage,
  mapBreakthroughItemBankRows,
  type BreakthroughItemBankRow,
  type BreakthroughSkillNodeRow,
} from "@/features/breakthrough-events/breakthrough-item-bank-pure";

export async function selectBreakthroughPack(
  _userId: string,
  nodeId: string,
): Promise<
  { questions: PracticeQuestionMcq[]; itemBankIds: string[] } | { error: string }
> {
  const admin = createAdminClient();

  const { data: node, error: nodeError } = await admin
    .from("skill_nodes")
    .select("id, unit_number, unit_name, node_name, exam_stakes")
    .eq("id", nodeId)
    .maybeSingle();

  if (nodeError || !node) {
    return { error: buildBreakthroughPackUnavailableMessage("this skill") };
  }

  const { data: items, error: itemsError } = await admin
    .from("item_bank")
    .select(
      "id, skill_node_id, prompt, options, correct_answer, explanation, difficulty_rating",
    )
    .eq("status", "approved")
    .eq("skill_node_id", nodeId)
    .order("difficulty_rating", { ascending: true })
    .limit(BREAKTHROUGH_PACK_TARGET_COUNT);

  if (itemsError || !items?.length || items.length < BREAKTHROUGH_PACK_MIN_COUNT) {
    return { error: buildBreakthroughPackUnavailableMessage(node.node_name) };
  }

  const pack = mapBreakthroughItemBankRows(
    items as BreakthroughItemBankRow[],
    node as BreakthroughSkillNodeRow,
  );
  if (!pack) {
    return { error: buildBreakthroughPackUnavailableMessage(node.node_name) };
  }

  return pack;
}

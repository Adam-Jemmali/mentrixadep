import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import type { GuestTryQuestion } from "@/features/quest/guest-try-types";

export const GUEST_AP_CALC_TRY_COUNT = 10;
export const GUEST_AP_CALC_MIN_SKILL_NODES = 5;

type SkillNodeRow = {
  id: string;
  unit_number: number;
  unit_name: string;
  node_name: string;
};

type ItemBankRow = {
  id: string;
  skill_node_id: string;
  question_type: string;
  prompt: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
};

function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function unitWeight(unitNumber: number): number {
  return Math.max(1, 9 - unitNumber);
}

function pickWeightedNodeId(nodes: SkillNodeRow[]): string | null {
  if (nodes.length === 0) return null;
  const weights = nodes.map((node) => ({
    id: node.id,
    weight: unitWeight(node.unit_number),
  }));
  const total = weights.reduce((sum, row) => sum + row.weight, 0);
  let roll = Math.random() * total;
  for (const row of weights) {
    roll -= row.weight;
    if (roll <= 0) return row.id;
  }
  return weights[weights.length - 1]!.id;
}

function pickWeightedUniqueNodeIds(nodes: SkillNodeRow[], count: number): string[] {
  const pool = [...nodes];
  const picked: string[] = [];

  while (picked.length < count && pool.length > 0) {
    const chosenId = pickWeightedNodeId(pool);
    if (!chosenId) break;
    picked.push(chosenId);
    const idx = pool.findIndex((node) => node.id === chosenId);
    if (idx >= 0) pool.splice(idx, 1);
  }

  return picked;
}

function pickRandomUnusedItem(
  items: ItemBankRow[] | undefined,
  usedItemIds: Set<string>
): ItemBankRow | null {
  if (!items?.length) return null;
  const pool = shuffle(items).filter((item) => !usedItemIds.has(item.id));
  return pool[0] ?? null;
}

function itemToGuestTryQuestion(
  item: ItemBankRow,
  node: SkillNodeRow
): GuestTryQuestion | null {
  const options = parseOptions(item.options);
  if (options.length !== 4) return null;

  let correctIndex = options.findIndex((option) => option === item.correct_answer);
  if (correctIndex < 0) {
    const normalizedCorrect = item.correct_answer.trim();
    correctIndex = options.findIndex((option) => option.trim() === normalizedCorrect);
  }
  if (correctIndex < 0) return null;

  return {
    id: item.id,
    kind: "mcq",
    prompt: item.prompt,
    explanation: item.explanation,
    options,
    correctIndex,
    skillNodeId: item.skill_node_id,
    unitNumber: node.unit_number,
    unitName: node.unit_name,
    nodeName: node.node_name,
  };
}

export async function selectGuestTryItemBankQuestions(): Promise<GuestTryQuestion[]> {
  const admin = createAdminClient();

  const { data: nodes, error: nodesError } = await admin
    .from("skill_nodes")
    .select("id, unit_number, unit_name, node_name")
    .eq("subject", AP_CALC_AB_SUBJECT)
    .order("display_order");

  if (nodesError || !nodes?.length) return [];

  const skillNodes = nodes as SkillNodeRow[];
  const nodeById = new Map(skillNodes.map((node) => [node.id, node]));
  const nodeIds = skillNodes.map((node) => node.id);

  const { data: items, error: itemsError } = await admin
    .from("item_bank")
    .select(
      "id, skill_node_id, question_type, prompt, options, correct_answer, explanation"
    )
    .eq("status", "approved")
    .eq("question_type", "mcq")
    .in("skill_node_id", nodeIds);

  if (itemsError || !items?.length) return [];

  const itemsByNode = new Map<string, ItemBankRow[]>();
  for (const row of items as ItemBankRow[]) {
    const list = itemsByNode.get(row.skill_node_id) ?? [];
    list.push(row);
    itemsByNode.set(row.skill_node_id, list);
  }

  const eligibleNodes = skillNodes.filter((node) => (itemsByNode.get(node.id)?.length ?? 0) > 0);
  if (eligibleNodes.length < GUEST_AP_CALC_MIN_SKILL_NODES) return [];

  const seedNodeIds = pickWeightedUniqueNodeIds(
    eligibleNodes,
    GUEST_AP_CALC_MIN_SKILL_NODES
  );
  const selected: GuestTryQuestion[] = [];
  const usedItemIds = new Set<string>();

  for (const nodeId of seedNodeIds) {
    const item = pickRandomUnusedItem(itemsByNode.get(nodeId), usedItemIds);
    if (!item) continue;
    const node = nodeById.get(nodeId);
    if (!node) continue;
    const question = itemToGuestTryQuestion(item, node);
    if (!question) continue;
    usedItemIds.add(item.id);
    selected.push(question);
  }

  const distinctNodes = new Set(selected.map((q) => q.skillNodeId).filter(Boolean));
  if (distinctNodes.size < GUEST_AP_CALC_MIN_SKILL_NODES) return [];

  while (selected.length < GUEST_AP_CALC_TRY_COUNT) {
    const nodeId = pickWeightedNodeId(eligibleNodes);
    if (!nodeId) break;
    const item = pickRandomUnusedItem(itemsByNode.get(nodeId), usedItemIds);
    if (!item) {
      const anyUnused = shuffle(items as ItemBankRow[]).find((row) => !usedItemIds.has(row.id));
      if (!anyUnused) break;
      const node = nodeById.get(anyUnused.skill_node_id);
      if (!node) break;
      const question = itemToGuestTryQuestion(anyUnused, node);
      if (!question) break;
      usedItemIds.add(anyUnused.id);
      selected.push(question);
      continue;
    }
    const node = nodeById.get(nodeId);
    if (!node) break;
    const question = itemToGuestTryQuestion(item, node);
    if (!question) break;
    usedItemIds.add(item.id);
    selected.push(question);
  }

  if (selected.length < GUEST_AP_CALC_TRY_COUNT) return [];

  return shuffle(selected);
}

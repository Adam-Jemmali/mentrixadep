import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { PracticeQuestionMcq } from "@/features/quest/practice-quest-types";
import {
  AP_CALC_AB_SUBJECT,
  isApCalculusAbSubject,
} from "@/features/quest/ap-calc-ab-subject";
import { getPendingPostSessionTargetNodeIds } from "@/features/breakthrough-events/post-session-retest";

type SkillNodeRow = {
  id: string;
  unit_number: number;
  unit_name: string;
  node_name: string;
  node_slug: string;
  display_order: number;
  exam_stakes: string | null;
};

type ItemBankRow = {
  id: string;
  skill_node_id: string;
  prompt: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
};

export function computePracticePackQuestionCount(count: number): number {
  return Math.min(10, Math.max(5, Math.floor(count)));
}

export function pickNeededNodeIds(prioritizedNodeIds: string[], targetCount: number): string[] {
  const needed: string[] = [];
  for (const id of prioritizedNodeIds) {
    if (!needed.includes(id)) needed.push(id);
    if (needed.length >= targetCount) break;
  }
  return needed;
}

export function hasApprovedCoverageForNodes(
  neededNodeIds: string[],
  itemsByNode: ReadonlyMap<string, ItemBankRow[]>
): boolean {
  return neededNodeIds.every((nodeId) => (itemsByNode.get(nodeId)?.length ?? 0) > 0);
}

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

type KnowledgePriorityRow = {
  skill_node_id: string | null;
  next_review_at: string | null;
  first_attempt_correct: boolean | null;
  attempts: number;
};

async function buildPriorityNodeIds(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  skillNodes: SkillNodeRow[],
  limit: number
): Promise<string[]> {
  const nodeIds = skillNodes.map((node) => node.id);
  const now = new Date().toISOString();

  const { data: knowledge } = await admin
    .from("student_knowledge_nodes")
    .select("skill_node_id, next_review_at, first_attempt_correct, attempts")
    .eq("user_id", userId)
    .eq("subject", AP_CALC_AB_SUBJECT)
    .in("skill_node_id", nodeIds);

  const due: string[] = [];
  const weak: string[] = [];
  const attemptedIds = new Set<string>();

  for (const row of (knowledge ?? []) as KnowledgePriorityRow[]) {
    if (!row.skill_node_id) continue;
    attemptedIds.add(row.skill_node_id);
    if (row.next_review_at && row.next_review_at <= now) {
      due.push(row.skill_node_id);
    } else if (row.first_attempt_correct === false) {
      weak.push(row.skill_node_id);
    }
  }

  const unseen = skillNodes.filter((node) => !attemptedIds.has(node.id));
  const newMaterial = pickWeightedNodeIds(unseen, limit);

  const ordered: string[] = [];
  for (const id of [...due, ...weak, ...newMaterial]) {
    if (!ordered.includes(id)) ordered.push(id);
  }

  if (ordered.length < limit) {
    for (const id of pickWeightedNodeIds(skillNodes, limit)) {
      if (!ordered.includes(id)) ordered.push(id);
    }
  }

  return ordered;
}

function pickWeightedNodeIds(nodes: SkillNodeRow[], limit: number): string[] {
  const weights = nodes.map((node) => ({
    id: node.id,
    weight: Math.max(1, 9 - node.unit_number),
  }));
  const total = weights.reduce((sum, row) => sum + row.weight, 0);
  const picked: string[] = [];
  const pool = [...weights];

  while (picked.length < limit && pool.length > 0) {
    let roll = Math.random() * total;
    let chosenIndex = 0;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i]!.weight;
      if (roll <= 0) {
        chosenIndex = i;
        break;
      }
    }
    const chosen = pool.splice(chosenIndex, 1)[0]!;
    if (!picked.includes(chosen.id)) picked.push(chosen.id);
  }

  return picked;
}

function itemToPracticeQuestion(item: ItemBankRow, node: SkillNodeRow): PracticeQuestionMcq | null {
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
    options,
    correctIndex,
    explanation: item.explanation,
    skillNodeId: item.skill_node_id,
    topicTag: node.unit_name,
    subtopicTag: node.node_name,
    unitNumber: node.unit_number,
    examStakes: node.exam_stakes?.trim() || undefined,
  };
}

export async function selectItemBankQuestions(
  userId: string,
  subject: string,
  count: number
): Promise<PracticeQuestionMcq[]> {
  if (!isApCalculusAbSubject(subject)) return [];

  const targetCount = computePracticePackQuestionCount(count);
  const admin = createAdminClient();

  const { data: nodes, error: nodesError } = await admin
    .from("skill_nodes")
    .select("id, unit_number, unit_name, node_name, node_slug, display_order, exam_stakes")
    .eq("subject", AP_CALC_AB_SUBJECT)
    .order("display_order");

  if (nodesError || !nodes?.length) return [];

  const skillNodes = nodes as SkillNodeRow[];
  const nodeById = new Map(skillNodes.map((node) => [node.id, node]));

  const validNodeIds = new Set(skillNodes.map((node) => node.id));
  const sessionRetestIds = await getPendingPostSessionTargetNodeIds(userId, validNodeIds);
  const basePrioritized = await buildPriorityNodeIds(admin, userId, skillNodes, targetCount);
  const prioritizedNodeIds =
    sessionRetestIds.length > 0
      ? [
          ...sessionRetestIds,
          ...basePrioritized.filter((id) => !sessionRetestIds.includes(id)),
        ]
      : basePrioritized;

  const nodeIds = skillNodes.map((node) => node.id);
  const { data: items, error: itemsError } = await admin
    .from("item_bank")
    .select("id, skill_node_id, prompt, options, correct_answer, explanation")
    .eq("status", "approved")
    .in("skill_node_id", nodeIds);

  if (itemsError || !items?.length) return [];

  const itemsByNode = new Map<string, ItemBankRow[]>();
  for (const row of items as ItemBankRow[]) {
    const list = itemsByNode.get(row.skill_node_id) ?? [];
    list.push(row);
    itemsByNode.set(row.skill_node_id, list);
  }

  const neededNodeIds = pickNeededNodeIds(prioritizedNodeIds, targetCount);
  if (
    neededNodeIds.length < targetCount ||
    !hasApprovedCoverageForNodes(neededNodeIds, itemsByNode)
  ) {
    return [];
  }

  const selected: PracticeQuestionMcq[] = [];
  const usedItemIds = new Set<string>();

  for (const nodeId of neededNodeIds) {
    const pool = shuffle(itemsByNode.get(nodeId) ?? []);
    const item = pool.find((row) => !usedItemIds.has(row.id));
    if (!item) return [];

    const node = nodeById.get(nodeId);
    if (!node) return [];

    const question = itemToPracticeQuestion(item, node);
    if (!question) return [];

    usedItemIds.add(item.id);
    selected.push(question);
  }

  if (selected.length < targetCount) return [];

  return selected;
}

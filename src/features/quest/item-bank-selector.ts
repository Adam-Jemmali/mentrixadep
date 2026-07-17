import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { PracticeQuestionMcq } from "@/features/quest/practice-quest-types";
import {
  parsePartialCreditRules,
  parseSolutionSteps,
} from "@/features/quest/components/step-feedback-pure";
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
  solution_steps?: unknown;
  answer_expression?: string | null;
  partial_credit_rules?: unknown;
};

const ITEM_BANK_BASE_SELECT =
  "id, skill_node_id, prompt, options, correct_answer, explanation";
const ITEM_BANK_EXTENDED_SELECT =
  `${ITEM_BANK_BASE_SELECT}, solution_steps, answer_expression, partial_credit_rules`;

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

/**
 * Focus packs lead with the focused node, then same-unit nodes, then priority.
 * Never requires targetCount unique items from a single node.
 */
export function buildPackNodePickOrder(args: {
  focusSkillNodeId?: string;
  prioritizedNodeIds: string[];
  skillNodes: Array<{ id: string; unit_number: number }>;
  usableCountByNode: ReadonlyMap<string, number>;
  targetCount: number;
}): string[] {
  const { focusSkillNodeId, prioritizedNodeIds, skillNodes, usableCountByNode, targetCount } = args;
  const order: string[] = [];

  const pushNodeSlots = (nodeId: string, slots: number) => {
    const usable = usableCountByNode.get(nodeId) ?? 0;
    const remainingForNode = Math.max(0, usable - order.filter((id) => id === nodeId).length);
    const toAdd = Math.min(slots, remainingForNode, targetCount - order.length);
    for (let i = 0; i < toAdd; i++) order.push(nodeId);
  };

  if (focusSkillNodeId) {
    pushNodeSlots(focusSkillNodeId, targetCount);
    const focusUnit = skillNodes.find((node) => node.id === focusSkillNodeId)?.unit_number;
    if (focusUnit != null) {
      for (const node of skillNodes) {
        if (order.length >= targetCount) break;
        if (node.id === focusSkillNodeId || node.unit_number !== focusUnit) continue;
        pushNodeSlots(node.id, targetCount - order.length);
      }
    }
  }

  for (const nodeId of prioritizedNodeIds) {
    if (order.length >= targetCount) break;
    pushNodeSlots(nodeId, 1);
  }

  for (const node of skillNodes) {
    if (order.length >= targetCount) break;
    pushNodeSlots(node.id, targetCount - order.length);
  }

  return order;
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

export function itemToPracticeQuestion(item: ItemBankRow, node: SkillNodeRow): PracticeQuestionMcq | null {
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
    solutionSteps: parseSolutionSteps(item.solution_steps),
    answerExpression: item.answer_expression?.trim() || undefined,
    partialCreditRules: parsePartialCreditRules(item.partial_credit_rules),
    correctAnswer: item.correct_answer,
  };
}

async function loadApprovedItemBankRows(
  admin: ReturnType<typeof createAdminClient>,
  nodeIds: string[],
): Promise<ItemBankRow[]> {
  const extended = await admin
    .from("item_bank")
    .select(ITEM_BANK_EXTENDED_SELECT)
    .eq("status", "approved")
    .in("skill_node_id", nodeIds);

  if (!extended.error && extended.data?.length) {
    return extended.data as ItemBankRow[];
  }

  const base = await admin
    .from("item_bank")
    .select(ITEM_BANK_BASE_SELECT)
    .eq("status", "approved")
    .in("skill_node_id", nodeIds);

  if (base.error || !base.data?.length) return [];
  return base.data as ItemBankRow[];
}

export async function selectItemBankQuestions(
  userId: string,
  subject: string,
  count: number,
  options?: { focusSkillNodeId?: string },
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
  const items = await loadApprovedItemBankRows(admin, nodeIds);
  if (!items.length) return [];

  const itemsByNode = new Map<string, ItemBankRow[]>();
  const usableCountByNode = new Map<string, number>();

  for (const row of items) {
    const node = nodeById.get(row.skill_node_id);
    if (!node) continue;
    if (!itemToPracticeQuestion(row, node)) continue;
    const list = itemsByNode.get(row.skill_node_id) ?? [];
    list.push(row);
    itemsByNode.set(row.skill_node_id, list);
    usableCountByNode.set(row.skill_node_id, list.length);
  }

  const neededNodeIds = buildPackNodePickOrder({
    focusSkillNodeId: options?.focusSkillNodeId,
    prioritizedNodeIds,
    skillNodes,
    usableCountByNode,
    targetCount,
  });

  if (neededNodeIds.length < targetCount) return [];

  const selected: PracticeQuestionMcq[] = [];
  const usedItemIds = new Set<string>();

  for (const nodeId of neededNodeIds) {
    const node = nodeById.get(nodeId);
    if (!node) continue;

    const pool = shuffle(itemsByNode.get(nodeId) ?? []);
    const item = pool.find((row) => !usedItemIds.has(row.id));
    if (!item) continue;

    const question = itemToPracticeQuestion(item, node);
    if (!question) continue;

    usedItemIds.add(item.id);
    selected.push(question);
    if (selected.length >= targetCount) break;
  }

  if (selected.length < targetCount) return [];

  return selected;
}

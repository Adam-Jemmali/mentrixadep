import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type {
  PracticeQuestion,
  PracticeQuestionCompleteExpression,
  PracticeQuestionDragOrder,
  PracticeQuestionFreeResponse,
  PracticeQuestionGraphFeature,
  PracticeQuestionMcq,
  PracticeQuestionMultiPart,
} from "@/features/quest/practice-quest-types";
import {
  parsePartialCreditRules,
  parseSolutionSteps,
} from "@/features/quest/components/step-feedback-pure";
import {
  isMultiPartItemFormat,
  parseMultiPartParts,
} from "@/features/quest/multi-part-pure";
import {
  AP_CALC_AB_SUBJECT,
  isApCalculusAbSubject,
} from "@/features/quest/ap-calc-ab-subject";
import { getPendingPostSessionTargetNodeIds } from "@/features/breakthrough-events/post-session-retest";
import {
  DEFAULT_CHALLENGE_DIFFICULTY,
  preferItemsNearChallengeDifficulty,
} from "@/features/quest/challenge-difficulty-pure";
import { loadChallengeDifficultyByNodeIds } from "@/features/quest/challenge-difficulty";
import { enrichQuestStimulus, parseQuestStimulus } from "@/features/quest/quest-stimulus-pure";
import {
  parseClozeBlanks,
  parseDragOrderedItems,
  parseGraphFeatureTargets,
  preferConstructionMix,
  pickDiversePackItem,
  constructionItemFingerprint,
  difficultyRatingBias,
} from "@/features/quest/quest-interaction-formats-pure";
import type { PracticeDifficulty } from "@/features/quest/practice-quest-types";

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
  difficulty_rating?: number | null;
  item_format?: string | null;
  stimulus?: unknown;
  authoring_meta?: unknown;
};

const ITEM_BANK_BASE_SELECT =
  "id, skill_node_id, prompt, options, correct_answer, explanation, difficulty_rating";
const ITEM_BANK_EXTENDED_SELECT =
  `${ITEM_BANK_BASE_SELECT}, solution_steps, answer_expression, partial_credit_rules, item_format, stimulus, authoring_meta`;

function sharedMeta(item: ItemBankRow, node: SkillNodeRow) {
  return {
    skillNodeId: item.skill_node_id,
    topicTag: node.unit_name,
    subtopicTag: node.node_name,
    unitNumber: node.unit_number,
    examStakes: node.exam_stakes?.trim() || undefined,
  };
}

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

export function itemToPracticeQuestion(
  item: ItemBankRow,
  node: SkillNodeRow,
): PracticeQuestion | null {
  const enriched = enrichQuestStimulus({
    prompt: item.prompt,
    stimulus: parseQuestStimulus(item.stimulus),
  });
  const stimulus = enriched.stimulus;
  const prompt = enriched.prompt;
  const format = String(item.item_format ?? "mcq").toLowerCase();
  const meta = sharedMeta(item, node);
  const stimulusOpt = stimulus.length > 0 ? stimulus : undefined;

  if (isMultiPartItemFormat(item.item_format)) {
    const parts = parseMultiPartParts(item.solution_steps);
    if (parts.length < 2) return null;
    const multi: PracticeQuestionMultiPart = {
      id: item.id,
      kind: "multi_part",
      prompt,
      parts,
      explanation: item.explanation,
      ...meta,
      stimulus: stimulusOpt,
    };
    return multi;
  }

  if (format === "free_response") {
    const answerExpression = item.answer_expression?.trim() || item.correct_answer?.trim() || "";
    if (!answerExpression) return null;
    const fr: PracticeQuestionFreeResponse = {
      id: item.id,
      kind: "free_response",
      prompt,
      answerExpression,
      explanation: item.explanation,
      ...meta,
      solutionSteps: parseSolutionSteps(item.solution_steps),
      partialCreditRules: parsePartialCreditRules(item.partial_credit_rules),
      stimulus: stimulusOpt,
    };
    return fr;
  }

  if (format === "complete_expression") {
    const blanks = parseClozeBlanks(item.solution_steps);
    if (blanks.length < 1) return null;
    const cloze: PracticeQuestionCompleteExpression = {
      id: item.id,
      kind: "complete_expression",
      prompt,
      blanks,
      explanation: item.explanation,
      ...meta,
      stimulus: stimulusOpt,
    };
    return cloze;
  }

  if (format === "drag_order") {
    const orderedItems = parseDragOrderedItems(item.options);
    if (orderedItems.length < 2) return null;
    const drag: PracticeQuestionDragOrder = {
      id: item.id,
      kind: "drag_order",
      prompt,
      orderedItems,
      explanation: item.explanation,
      ...meta,
      stimulus: stimulusOpt,
    };
    return drag;
  }

  if (format === "graph_feature") {
    const targets = parseGraphFeatureTargets(item.solution_steps);
    const answerExpression = item.answer_expression?.trim() || undefined;
    if (targets.length < 1 && !answerExpression) return null;
    if (!stimulusOpt?.some((s) => s.kind === "function_graph")) return null;
    const graphBlock = stimulusOpt.find((s) => s.kind === "function_graph");
    const sketchDomain =
      graphBlock && graphBlock.kind === "function_graph" && graphBlock.domain
        ? graphBlock.domain
        : ([-2, 2] as [number, number]);
    const graphQ: PracticeQuestionGraphFeature = {
      id: item.id,
      kind: "graph_feature",
      prompt,
      targets,
      answerExpression,
      explanation: item.explanation,
      ...meta,
      stimulus: stimulusOpt,
      maxSelections: Math.max(targets.length, answerExpression ? 8 : 1),
      sketchDomain,
    };
    return graphQ;
  }

  const options = parseOptions(item.options);
  if (options.length !== 4) return null;

  let correctIndex = options.findIndex((option) => option === item.correct_answer);
  if (correctIndex < 0) {
    const normalizedCorrect = item.correct_answer.trim();
    correctIndex = options.findIndex((option) => option.trim() === normalizedCorrect);
  }
  if (correctIndex < 0) return null;

  const mcq: PracticeQuestionMcq = {
    id: item.id,
    kind: "mcq",
    prompt,
    options,
    correctIndex,
    explanation: item.explanation,
    ...meta,
    solutionSteps: parseSolutionSteps(item.solution_steps),
    answerExpression: item.answer_expression?.trim() || undefined,
    partialCreditRules: parsePartialCreditRules(item.partial_credit_rules),
    correctAnswer: item.correct_answer,
    stimulus: stimulusOpt,
  };
  return mcq;
}

async function loadApprovedItemBankRows(
  admin: ReturnType<typeof createAdminClient>,
  nodeIds: string[],
): Promise<ItemBankRow[]> {
  const pageSize = 1000;
  const out: ItemBankRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const extended = await admin
      .from("item_bank")
      .select(ITEM_BANK_EXTENDED_SELECT)
      .eq("status", "approved")
      .in("skill_node_id", nodeIds)
      .range(from, to);

    if (extended.error) {
      if (from === 0) break;
      console.error("[item-bank] page load failed:", extended.error.message);
      break;
    }
    const chunk = (extended.data ?? []) as ItemBankRow[];
    out.push(...chunk);
    if (chunk.length < pageSize) {
      return out;
    }
  }

  // Fallback without extended columns if first page failed hard.
  if (out.length > 0) return out;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const base = await admin
      .from("item_bank")
      .select(ITEM_BANK_BASE_SELECT)
      .eq("status", "approved")
      .in("skill_node_id", nodeIds)
      .range(from, to);
    if (base.error || !base.data?.length) break;
    out.push(...(base.data as ItemBankRow[]));
    if (base.data.length < pageSize) break;
  }
  return out;
}

/** Drop legacy shared stems (same UV / same poly) so packs explore unique math. */
export function isLegacyRepetitiveConstructionStem(row: {
  prompt?: string | null;
  authoring_meta?: unknown;
}): boolean {
  const prompt = String(row.prompt ?? "");
  if (/product \$uv\$/i.test(prompt) || /differentiate a product \$uv\$/i.test(prompt)) {
    return true;
  }
  const meta =
    row.authoring_meta && typeof row.authoring_meta === "object"
      ? (row.authoring_meta as Record<string, unknown>)
      : null;
  const key = typeof meta?.template_key === "string" ? meta.template_key.trim() : "";
  // Pre-variety shared keys (no unique answer / coeff suffix).
  if (
    /^(limits|derivatives|applications|integrals):(drag-product|deriv-poly|deriv-trig|deriv-exp|lim-diff-quot|lim-cubic|app-opt|app-related|int-antideriv|int-ftc|cloze-exp|cloze-sin|drag-def|drag-opt|drag-ftc|feat-crit|feat-opt|feat-vertex|feat-area-ends|sketch-sin|sketch-quad|sketch-cubic|sketch-accum|sketch-abs-like)$/.test(
      key,
    )
  ) {
    return true;
  }
  return false;
}

async function loadRecentPracticeItemIds(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  limitQuests = 20,
): Promise<Set<string>> {
  const { data } = await admin
    .from("quests")
    .select("metadata")
    .eq("creator_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limitQuests);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const meta = row.metadata as { questions?: Array<{ id?: string }> } | null;
    const questions = meta?.questions;
    if (!Array.isArray(questions)) continue;
    for (const q of questions) {
      if (typeof q?.id === "string" && q.id) ids.add(q.id);
    }
  }
  return ids;
}

function unitPoolForNode(
  nodeId: string,
  skillNodes: SkillNodeRow[],
  itemsByNode: Map<string, ItemBankRow[]>,
): ItemBankRow[] {
  const focus = skillNodes.find((n) => n.id === nodeId);
  if (!focus) return itemsByNode.get(nodeId) ?? [];
  const pooled: ItemBankRow[] = [];
  for (const node of skillNodes) {
    if (node.unit_number !== focus.unit_number) continue;
    pooled.push(...(itemsByNode.get(node.id) ?? []));
  }
  return pooled.length > 0 ? pooled : (itemsByNode.get(nodeId) ?? []);
}

export async function selectItemBankQuestions(
  userId: string,
  subject: string,
  count: number,
  options?: { focusSkillNodeId?: string; difficulty?: PracticeDifficulty },
): Promise<PracticeQuestion[]> {
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

  const recentItemIds = await loadRecentPracticeItemIds(admin, userId);
  const challengeByNode = await loadChallengeDifficultyByNodeIds(userId, nodeIds);
  const ratingBias = difficultyRatingBias(options?.difficulty);

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

  const selected: PracticeQuestion[] = [];
  const usedItemIds = new Set<string>(recentItemIds);
  const usedFormats = new Set<string>();
  const usedFingerprints = new Set<string>();
  let constructionCount = 0;

  for (const nodeId of neededNodeIds) {
    const node = nodeById.get(nodeId);
    if (!node) continue;

    const studentRating = challengeByNode.get(nodeId);
    const effectiveRating =
      studentRating == null ? DEFAULT_CHALLENGE_DIFFICULTY + ratingBias : studentRating + ratingBias;

    const primaryRows = (itemsByNode.get(nodeId) ?? []).filter(
      (row) => !isLegacyRepetitiveConstructionStem(row),
    );
    const unitRows = unitPoolForNode(nodeId, skillNodes, itemsByNode).filter(
      (row) => !isLegacyRepetitiveConstructionStem(row),
    );
    const combinedFresh = [
      ...primaryRows,
      ...unitRows.filter((row) => row.skill_node_id !== nodeId),
    ];
    // Fall back to full pool only if filtering would starve the pack.
    const combinedRows =
      combinedFresh.length > 0
        ? combinedFresh
        : [
            ...(itemsByNode.get(nodeId) ?? []),
            ...unitPoolForNode(nodeId, skillNodes, itemsByNode).filter(
              (row) => row.skill_node_id !== nodeId,
            ),
          ];

    const withRating = combinedRows.map((row) => ({
      ...row,
      difficultyRating: row.difficulty_rating ?? DEFAULT_CHALLENGE_DIFFICULTY,
    }));
    const preferredDifficulty = preferItemsNearChallengeDifficulty(withRating, effectiveRating);
    const preferredMix = preferConstructionMix(
      preferredDifficulty,
      constructionCount,
      selected.length,
    );
    let item = pickDiversePackItem(
      preferredMix,
      usedItemIds,
      usedFormats,
      usedFingerprints,
    );

    // If recent-exclusion emptied the pool, allow older items (still unique within this pack).
    if (!item) {
      const packOnlyIds = new Set(selected.map((q) => q.id));
      item = pickDiversePackItem(
        preferredMix,
        packOnlyIds,
        usedFormats,
        usedFingerprints,
      );
    }

    if (!item) continue;

    const itemNode = nodeById.get(item.skill_node_id) ?? node;
    const question = itemToPracticeQuestion(item, itemNode);
    if (!question) continue;

    usedItemIds.add(item.id);
    usedFormats.add(String(item.item_format ?? question.kind).toLowerCase());
    usedFingerprints.add(constructionItemFingerprint(item));
    selected.push(question);
    if (question.kind !== "mcq") constructionCount += 1;
    if (selected.length >= targetCount) break;
  }

  if (selected.length < targetCount) return [];

  return selected;
}

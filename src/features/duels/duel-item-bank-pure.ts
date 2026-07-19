import type { SkillDuelQuestion } from "@/shared/types/database";
import {
  DUEL_MAX_QUESTIONS_PER_NODE,
  DUEL_QUESTION_COUNT,
} from "@/features/duels/duel-constants";

export const DUEL_MIN_QUESTION_COUNT = 3;

export const DUEL_ITEM_BANK_UNAVAILABLE_MESSAGE =
  "AP Calculus AB duel items are not ready yet. Verified questions from the item bank are required before this duel can start.";

export type DuelItemBankRow = {
  id: string;
  skill_node_id: string;
  prompt: string;
  options: unknown;
  correct_answer: string;
};

export function filterDuelRowsToUnlockedNodes(
  rows: DuelItemBankRow[],
  unlockedNodeIds: ReadonlySet<string>,
): DuelItemBankRow[] {
  return rows.filter((row) => unlockedNodeIds.has(row.skill_node_id));
}

export function parseItemBankOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

export function itemBankRowToDuelQuestion(row: DuelItemBankRow): SkillDuelQuestion | null {
  const choices = parseItemBankOptions(row.options);
  if (choices.length !== 4) return null;

  let correctIndex = choices.findIndex((choice) => choice === row.correct_answer);
  if (correctIndex < 0) {
    const normalizedCorrect = row.correct_answer.trim();
    correctIndex = choices.findIndex((choice) => choice.trim() === normalizedCorrect);
  }
  if (correctIndex < 0) return null;

  return {
    prompt: row.prompt,
    choices,
    correctIndex,
    type: "mcq",
    skillNodeId: row.skill_node_id,
  };
}

function shuffle<T>(items: T[], rng = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** Normalize stem so near-duplicate prompts collide across nodes. */
export function duelPromptFingerprint(prompt: string): string {
  return prompt
    .replace(/\$[^$]*\$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72)
    .toLowerCase();
}

export type PickDuelItemBankOptions = {
  excludeIds?: ReadonlySet<string>;
  maxPerNode?: number;
  rng?: () => number;
};

/**
 * Competitive duel pack: shuffle, skip recent IDs, cap per skill node,
 * and avoid duplicate prompt fingerprints so packs do not feel identical.
 */
export function pickDuelItemBankRows(
  rows: DuelItemBankRow[],
  primaryNodeIds: ReadonlySet<string>,
  targetCount: number = DUEL_QUESTION_COUNT,
  minCount: number = DUEL_MIN_QUESTION_COUNT,
  options: PickDuelItemBankOptions = {},
): DuelItemBankRow[] {
  const excludeIds = options.excludeIds ?? new Set<string>();
  const maxPerNode = options.maxPerNode ?? DUEL_MAX_QUESTIONS_PER_NODE;
  const rng = options.rng ?? Math.random;

  const usable = rows.filter((row) => !excludeIds.has(row.id));
  const primary = shuffle(
    usable.filter((row) => primaryNodeIds.has(row.skill_node_id)),
    rng,
  );
  const backfill = shuffle(
    usable.filter((row) => !primaryNodeIds.has(row.skill_node_id)),
    rng,
  );

  const picked: DuelItemBankRow[] = [];
  const usedIds = new Set<string>();
  const usedFingerprints = new Set<string>();
  const perNode = new Map<string, number>();

  const tryAdd = (row: DuelItemBankRow, enforceNodeCap: boolean): boolean => {
    if (picked.length >= targetCount) return false;
    if (usedIds.has(row.id)) return false;
    const fp = duelPromptFingerprint(row.prompt);
    if (usedFingerprints.has(fp)) return false;
    const nodeCount = perNode.get(row.skill_node_id) ?? 0;
    if (enforceNodeCap && nodeCount >= maxPerNode) return false;
    usedIds.add(row.id);
    usedFingerprints.add(fp);
    perNode.set(row.skill_node_id, nodeCount + 1);
    picked.push(row);
    return true;
  };

  for (const row of primary) tryAdd(row, true);
  for (const row of backfill) tryAdd(row, true);

  // If caps starved the pack, relax node caps but keep fingerprint uniqueness.
  if (picked.length < minCount) {
    for (const row of [...primary, ...backfill]) tryAdd(row, false);
  }

  // Last resort: ignore fingerprints too (still unique IDs).
  if (picked.length < minCount) {
    for (const row of [...primary, ...backfill]) {
      if (picked.length >= targetCount) break;
      if (usedIds.has(row.id)) continue;
      usedIds.add(row.id);
      picked.push(row);
    }
  }

  return picked.length >= minCount ? picked : [];
}

export function duelRowsToQuestionPack(rows: DuelItemBankRow[]): {
  questions: SkillDuelQuestion[];
  itemBankIds: string[];
} | null {
  const questions: SkillDuelQuestion[] = [];
  const itemBankIds: string[] = [];

  for (const row of rows) {
    const question = itemBankRowToDuelQuestion(row);
    if (!question) return null;
    questions.push(question);
    itemBankIds.push(row.id);
  }

  if (questions.length < DUEL_MIN_QUESTION_COUNT) return null;
  return { questions, itemBankIds };
}

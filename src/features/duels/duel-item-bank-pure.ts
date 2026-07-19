import type { SkillDuelQuestion } from "@/shared/types/database";
import { DUEL_QUESTION_COUNT } from "@/features/duels/duel-constants";

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

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function pickDuelItemBankRows(
  rows: DuelItemBankRow[],
  primaryNodeIds: ReadonlySet<string>,
  targetCount: number = DUEL_QUESTION_COUNT,
  minCount: number = DUEL_MIN_QUESTION_COUNT,
): DuelItemBankRow[] {
  const primary = shuffle(rows.filter((row) => primaryNodeIds.has(row.skill_node_id)));
  const backfill = shuffle(rows.filter((row) => !primaryNodeIds.has(row.skill_node_id)));
  const picked: DuelItemBankRow[] = [];
  const usedIds = new Set<string>();

  for (const row of [...primary, ...backfill]) {
    if (picked.length >= targetCount) break;
    if (usedIds.has(row.id)) continue;
    usedIds.add(row.id);
    picked.push(row);
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

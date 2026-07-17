import type { PracticeQuestionMcq } from "@/features/quest/practice-quest-types";

export const BREAKTHROUGH_PACK_TARGET_COUNT = 5;
export const BREAKTHROUGH_PACK_MIN_COUNT = 3;
export const BREAKTHROUGH_PACK_DEFER_MS = 48 * 60 * 60 * 1000;

export type BreakthroughItemBankRow = {
  id: string;
  skill_node_id: string;
  prompt: string;
  options: unknown;
  correct_answer: string;
  explanation: string;
  difficulty_rating?: number | null;
};

export type BreakthroughSkillNodeRow = {
  id: string;
  unit_number: number;
  unit_name: string;
  node_name: string;
  exam_stakes: string | null;
};

export function buildBreakthroughPackUnavailableMessage(nodeName: string): string {
  const label = nodeName.trim() || "this skill";
  return `Your breakthrough on ${label} is confirmed. Your follow-up practice is being prepared.`;
}

export function addBreakthroughPackDeferDelay(base: Date): Date {
  return new Date(base.getTime() + BREAKTHROUGH_PACK_DEFER_MS);
}

export function isBreakthroughQueueRowAvailable(
  availableAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!availableAt) return true;
  const availableMs = new Date(availableAt).getTime();
  if (!Number.isFinite(availableMs)) return true;
  return availableMs <= nowMs;
}

function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

export function itemBankRowToBreakthroughQuestion(
  item: BreakthroughItemBankRow,
  node: BreakthroughSkillNodeRow,
): PracticeQuestionMcq | null {
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

export function mapBreakthroughItemBankRows(
  items: BreakthroughItemBankRow[],
  node: BreakthroughSkillNodeRow,
): { questions: PracticeQuestionMcq[]; itemBankIds: string[] } | null {
  const questions: PracticeQuestionMcq[] = [];
  const itemBankIds: string[] = [];

  for (const item of items) {
    const question = itemBankRowToBreakthroughQuestion(item, node);
    if (!question) return null;
    questions.push(question);
    itemBankIds.push(item.id);
  }

  if (questions.length < BREAKTHROUGH_PACK_MIN_COUNT) return null;
  return { questions, itemBankIds };
}

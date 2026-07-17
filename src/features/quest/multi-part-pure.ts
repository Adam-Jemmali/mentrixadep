import { parseSolutionSteps, type SolutionStep } from "@/features/quest/components/step-feedback-pure";

export const MULTI_PART_MAX_ATTEMPTS = 3;
export const MULTI_PART_CARRY_FORWARD_NOTE =
  "Part carried forward with the correct answer.";

export type MultiPartItemFormat = "mcq" | "free_response";

export type MultiPartPart = {
  partKey: string;
  prompt: string;
  itemFormat: MultiPartItemFormat;
  skillNodeId?: string;
  options?: string[];
  correctIndex?: number;
  answerExpression?: string;
  correctAnswer?: string;
  solutionSteps?: SolutionStep[];
};

export type MultiPartPartResult = {
  partKey: string;
  correct: boolean;
  attempts: number;
  carriedForward: boolean;
  studentAnswer?: string;
  revealedAnswer?: string;
};

export type MultiPartUiPartState = "locked" | "active" | "done";

export function partLetter(index: number): string {
  return String.fromCharCode(97 + index);
}

function parsePartFormat(raw: unknown): MultiPartItemFormat | null {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "mcq") return "mcq";
  if (value === "free_response" || value === "free-response" || value === "frq") {
    return "free_response";
  }
  return null;
}

function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

/** Parse multi_part solution_steps: array of parts with nested solution_steps. */
export function parseMultiPartParts(raw: unknown): MultiPartPart[] {
  if (!Array.isArray(raw)) return [];
  const parts: MultiPartPart[] = [];

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const prompt = String(record.prompt ?? "").trim();
    if (!prompt) continue;

    const format =
      parsePartFormat(record.item_format) ??
      parsePartFormat(record.itemFormat) ??
      (parseOptions(record.options).length === 4 ? "mcq" : "free_response");

    const options = parseOptions(record.options);
    const answerExpression = String(
      record.answer_expression ?? record.answerExpression ?? "",
    ).trim();
    const correctAnswer = String(
      record.correct_answer ?? record.correctAnswer ?? answerExpression,
    ).trim();

    let correctIndex: number | undefined;
    if (format === "mcq") {
      if (options.length !== 4) continue;
      correctIndex = options.findIndex((option) => option === correctAnswer);
      if (correctIndex < 0) {
        correctIndex = options.findIndex((option) => option.trim() === correctAnswer.trim());
      }
      if (correctIndex < 0) continue;
    } else if (!answerExpression && !correctAnswer) {
      continue;
    }

    const nestedSteps = record.solution_steps ?? record.solutionSteps;
    const skillNodeId = String(record.skill_node_id ?? record.skillNodeId ?? "").trim() || undefined;
    parts.push({
      partKey: String(record.part_key ?? record.partKey ?? partLetter(i)).trim() || partLetter(i),
      prompt,
      itemFormat: format,
      skillNodeId,
      options: format === "mcq" ? options : undefined,
      correctIndex,
      answerExpression: answerExpression || undefined,
      correctAnswer: correctAnswer || undefined,
      solutionSteps: parseSolutionSteps(nestedSteps),
    });
  }

  return parts;
}

export function isMultiPartItemFormat(raw: unknown): boolean {
  return String(raw ?? "")
    .trim()
    .toLowerCase() === "multi_part";
}

export function multiPartUiState(
  partIndex: number,
  activePartIndex: number,
  finishedParts: number,
): MultiPartUiPartState {
  if (partIndex < finishedParts || partIndex < activePartIndex) return "done";
  if (partIndex === activePartIndex) return "active";
  return "locked";
}

export function applyMultiPartAttempt(input: {
  part: MultiPartPart;
  prior?: MultiPartPartResult | null;
  correct: boolean;
  studentAnswer: string;
}): {
  result: MultiPartPartResult;
  unlockNext: boolean;
  retriesLeft: number;
} {
  const attempts = (input.prior?.attempts ?? 0) + 1;
  const revealed =
    !input.correct && attempts >= MULTI_PART_MAX_ATTEMPTS
      ? input.part.answerExpression ||
        input.part.correctAnswer ||
        (input.part.correctIndex != null
          ? input.part.options?.[input.part.correctIndex]
          : undefined)
      : undefined;

  const carriedForward = Boolean(revealed);
  const unlockNext = input.correct || carriedForward;
  const retriesLeft = Math.max(0, MULTI_PART_MAX_ATTEMPTS - attempts);

  return {
    result: {
      partKey: input.part.partKey,
      correct: input.correct,
      attempts,
      carriedForward,
      studentAnswer: input.studentAnswer,
      revealedAnswer: revealed,
    },
    unlockNext,
    retriesLeft,
  };
}

/** Base XP × parts correct ÷ total parts. */
export function computeMultiPartXp(
  partsCorrect: number,
  partsTotal: number,
  baseXp: number,
): number {
  if (partsTotal <= 0 || baseXp <= 0) return 0;
  const correct = Math.max(0, Math.min(partsTotal, partsCorrect));
  return Math.round(baseXp * (correct / partsTotal));
}

export function countMultiPartCorrect(results: MultiPartPartResult[]): number {
  return results.filter((part) => part.correct && !part.carriedForward).length;
}

export function formatMultiPartXpLine(partsCorrect: number, partsTotal: number, xp: number): string {
  return `+${xp} XP · ${partsCorrect}/${partsTotal} parts`;
}

export function multiPartCarryForwardLabel(partKey: string): string {
  return `Part ${partKey} carried forward with the correct answer.`;
}

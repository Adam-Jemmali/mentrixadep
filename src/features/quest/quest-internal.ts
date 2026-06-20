import { z } from "zod";
import type { QuestExplanationResponse, QuestVariant } from "@/shared/integrations/ai";
import {
  buildComputationalQuestFallback,
  buildConceptualQuestFallback,
  isComputationalQuestPrompt,
  matchCuratedQuestFallback,
} from "@/features/quest/quest-curated-fallbacks";

export type QuestGoal = "exam" | "interview" | "assignment";
export type QuestMode = "coach" | "exam";

export const submitQuestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  goal: z.enum(["exam", "interview", "assignment"]),
  mode: z.enum(["coach", "exam"]),
});

export const submitAnswerSchema = z.object({
  questId: z.string().uuid(),
  userAnswer: z.string().min(1).max(10000),
  goal: z.enum(["exam", "interview", "assignment"]),
  mode: z.enum(["coach", "exam"]),
});

export const QUEST_AI_UNAVAILABLE_MESSAGE = "AI temporarily unavailable, try again soon.";

export function normalizeQuestSolverErrorMessage(input: unknown): string {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof Error
        ? input.message
        : input && typeof input === "object" && "message" in input
          ? String((input as { message: unknown }).message ?? "")
          : "";
  const msg = raw.trim();
  const lower = msg.toLowerCase();
  if (
    lower.includes("temporarily unavailable") ||
    lower.includes("service unavailable") ||
    lower.includes("quest is temporarily unavailable")
  ) {
    return QUEST_AI_UNAVAILABLE_MESSAGE;
  }
  return msg || "Something went wrong.";
}

export function isQuestHardLimitMessage(input: unknown): boolean {
  const msg =
    typeof input === "string"
      ? input
      : input instanceof Error
        ? input.message
        : input && typeof input === "object" && "message" in input
          ? String((input as { message: unknown }).message ?? "")
          : "";
  const lower = msg.toLowerCase();
  return lower.includes("daily quest limit reached") || lower.includes("too many requests");
}

export function buildQuestFallbackResponse(
  prompt: string,
  _goal: QuestGoal,
  mode: QuestMode
): QuestExplanationResponse {
  const curated = matchCuratedQuestFallback(prompt, mode);
  if (curated) return curated;

  if (!isComputationalQuestPrompt(prompt)) {
    return buildConceptualQuestFallback(prompt, mode);
  }

  return buildComputationalQuestFallback(prompt, mode);
}

function normalizeAnswerForFallback(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:()[\]{}]/g, "")
    .replace(/\s*=\s*/g, "=")
    .trim();
}

function extractFallbackAnswerCandidates(input: string): string[] {
  const base = normalizeAnswerForFallback(input);
  if (!base) return [];

  const candidates = new Set<string>([base]);

  const eqIdx = base.lastIndexOf("=");
  if (eqIdx >= 0 && eqIdx < base.length - 1) {
    candidates.add(base.slice(eqIdx + 1).trim());
  }

  const isSplit = base.split(/\bis\b/).map((p) => p.trim()).filter(Boolean);
  if (isSplit.length >= 2) {
    const lastPart = isSplit[isSplit.length - 1];
    if (lastPart) {
      candidates.add(lastPart);
    }
  }

  const tailMath = base.match(/([a-z0-9+\-*/^=θπ∞%]+(?:\s*[a-z0-9+\-*/^=θπ∞%]+)*)$/i);
  if (tailMath?.[1]) {
    candidates.add(tailMath[1].trim());
  }

  return Array.from(candidates).filter((c) => c.length > 0);
}

/** Non-AI backup grading when evaluator is temporarily unavailable. */
export function fallbackEvaluateQuestAnswer(
  userAnswer: string,
  correctAnswer: string,
): { correct: boolean; feedback: string } {
  const userCandidates = extractFallbackAnswerCandidates(userAnswer);
  const correctCandidates = extractFallbackAnswerCandidates(correctAnswer);
  if (!userCandidates.length || !correctCandidates.length) {
    return {
      correct: false,
      feedback: "Could not grade right now. Please try again with a clearer final answer line.",
    };
  }

  const matched = userCandidates.some((u) =>
    correctCandidates.some((c) => u === c || c.includes(u) || u.includes(c))
  );

  if (matched) {
    return {
      correct: true,
      feedback: "Looks correct. Great work — your final result matches the expected answer.",
    };
  }

  return {
    correct: false,
    feedback:
      "Your answer does not match the expected result yet. Check the final simplified result and submit again.",
  };
}

export function buildQuestFallbackVariants(basePrompt: string): QuestVariant[] {
  const p = basePrompt.trim();
  const short = p.length > 220 ? `${p.slice(0, 220)}...` : p;
  return [
    {
      prompt: `${short}\n\nVariant A: keep the same concept but change one numeric value and solve again.`,
      metadata: { source: "fallback", kind: "nearby" },
    },
    {
      prompt: `${short}\n\nVariant B: solve the same concept under a boundary/edge-case assumption.`,
      metadata: { source: "fallback", kind: "edge_case" },
    },
    {
      prompt: `${short}\n\nVariant C: reframe the problem to solve for a different unknown.`,
      metadata: { source: "fallback", kind: "reframed" },
    },
  ];
}

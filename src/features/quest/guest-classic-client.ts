import type { AdaptiveWorldState } from "@/shared/integrations/ai/adaptive-quest";
import type { QuestGoal, QuestMode } from "@/features/quest/quest-internal";

export type GuestClassicSubmitResult = {
  questId: string;
  hints: string[];
  reasoning: string;
  solution: string;
  mode: QuestMode;
};

export type GuestClassicSubmitError = { error: true; message: string };

export type GuestClassicGradeResult = {
  correct: boolean;
  feedback?: string;
  xpAwarded?: number;
  totalXp?: number;
  streakDays?: number;
  preview?: boolean;
};

export type GuestAdaptiveTurnResult = {
  feedback: string;
  updatedWorldState: AdaptiveWorldState;
  isResolved: boolean;
};

async function postGuestClassic(body: Record<string, unknown>) {
  const res = await fetch("/api/guest-classic-quest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, unknown> & GuestClassicSubmitError;
  if (!res.ok || data.error) {
    return {
      error: true as const,
      message:
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : typeof data.error === "string"
            ? data.error
            : "Something went wrong. Please try again.",
    };
  }
  return data;
}

export async function submitGuestClassicQuest(
  prompt: string,
  goal: QuestGoal,
  mode: QuestMode,
): Promise<GuestClassicSubmitResult | GuestClassicSubmitError> {
  const data = await postGuestClassic({ action: "submit", prompt, goal, mode });
  if ("error" in data && data.error) return data;
  return data as unknown as GuestClassicSubmitResult;
}

export async function submitGuestClassicAnswer(
  questId: string,
  userAnswer: string,
  goal: QuestGoal,
  mode: QuestMode,
): Promise<GuestClassicGradeResult | GuestClassicSubmitError> {
  const data = await postGuestClassic({ action: "grade", questId, userAnswer, goal, mode });
  if ("error" in data && data.error) return data;
  return data as unknown as GuestClassicGradeResult;
}

export async function startGuestAdaptiveQuest(
  prompt: string,
  goal: QuestGoal,
  mode: QuestMode,
  subject: string,
): Promise<{ questId: string } | GuestClassicSubmitError> {
  const data = await postGuestClassic({ action: "adaptive_start", prompt, goal, mode, subject });
  if ("error" in data && data.error) return data;
  return { questId: String(data.questId) };
}

export async function sendGuestAdaptiveTurn(input: {
  questId: string;
  message: string;
  priorWorldState: AdaptiveWorldState | null;
  subject: string;
}): Promise<GuestAdaptiveTurnResult | GuestClassicSubmitError> {
  const data = await postGuestClassic({ action: "adaptive_turn", ...input });
  if ("error" in data && data.error) return data;
  return data as unknown as GuestAdaptiveTurnResult;
}

export async function completeGuestAdaptiveQuest(
  questId: string,
): Promise<GuestClassicGradeResult | GuestClassicSubmitError> {
  const data = await postGuestClassic({ action: "adaptive_complete", questId });
  if ("error" in data && data.error) return data;
  return data as unknown as GuestClassicGradeResult;
}

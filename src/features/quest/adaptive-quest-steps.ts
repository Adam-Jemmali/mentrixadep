import type { AdaptiveDifficultyLevel, AdaptiveWorldState } from "@/shared/integrations/ai/adaptive-quest";

export const ADAPTIVE_STEP_TOTAL = 3;

export function cleanTopicLabel(topic: string): string {
  return topic
    .trim()
    .replace(/^explain\s+/i, "")
    .replace(/\?+$/g, "")
    .replace(/\.+$/g, "")
    .trim()
    .slice(0, 180);
}

export function buildScenarioTitle(topic: string): string {
  const label = cleanTopicLabel(topic);
  return `Your classmate asks: "Can you teach me ${label} before our quiz?"`;
}

export function buildStepChallenge(topic: string, stepIndex: number, stepTotal = ADAPTIVE_STEP_TOTAL): string {
  const label = cleanTopicLabel(topic);
  if (stepIndex <= 1) {
    return `Step 1 of ${stepTotal}: State the core idea of ${label} in one sentence.`;
  }
  if (stepIndex === 2) {
    return `Step 2 of ${stepTotal}: Give a tiny worked example (3 to 5 lines) for ${label}.`;
  }
  return `Step 3 of ${stepTotal}: Name one common mistake with ${label} and how to avoid it.`;
}

export function createOpeningWorldState(topic: string): AdaptiveWorldState {
  return {
    scenarioTitle: buildScenarioTitle(topic),
    stepIndex: 1,
    stepTotal: ADAPTIVE_STEP_TOTAL,
    scenarioHealth: 85,
    currentChallenge: buildStepChallenge(topic, 1),
    difficultyLevel: "intermediate",
  };
}

export function isSubstantiveAdaptiveAnswer(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 40) return false;
  if (/^(idk|i don'?t know|not sure|no idea|unsure)\b/i.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 8;
}

export function advanceAdaptiveWorldState(
  prior: AdaptiveWorldState,
  topic: string,
  accepted: boolean
): { worldState: AdaptiveWorldState; isResolved: boolean; feedback: string } {
  if (!accepted) {
    return {
      worldState: {
        ...prior,
        scenarioHealth: Math.max(35, prior.scenarioHealth - 5),
      },
      isResolved: false,
      feedback: `Step ${prior.stepIndex} still needs more detail. ${prior.currentChallenge}`,
    };
  }

  if (prior.stepIndex >= prior.stepTotal) {
    return {
      worldState: {
        ...prior,
        scenarioHealth: 100,
        currentChallenge: "Challenge complete.",
      },
      isResolved: true,
      feedback: "You finished all three steps with a clear explanation. Challenge complete.",
    };
  }

  const nextStep = prior.stepIndex + 1;
  const done = nextStep > prior.stepTotal;
  return {
    worldState: {
      ...prior,
      stepIndex: nextStep,
      scenarioHealth: Math.min(100, prior.scenarioHealth + 10),
      currentChallenge: done ? "Challenge complete." : buildStepChallenge(topic, nextStep, prior.stepTotal),
    },
    isResolved: done,
    feedback: done
      ? "You finished all three steps with a clear explanation. Challenge complete."
      : `Step ${prior.stepIndex} complete. Now do step ${nextStep}.`,
  };
}

export function normalizeAdaptiveWorldState(
  raw: unknown,
  prior: AdaptiveWorldState | null,
  topic: string
): AdaptiveWorldState {
  const base = prior ?? createOpeningWorldState(topic);
  if (!raw || typeof raw !== "object") return base;

  const row = raw as Record<string, unknown>;
  const stepTotal =
    typeof row.stepTotal === "number" && row.stepTotal >= 1
      ? Math.min(5, Math.round(row.stepTotal))
      : base.stepTotal;
  const stepIndex =
    typeof row.stepIndex === "number" && row.stepIndex >= 1
      ? Math.min(stepTotal, Math.round(row.stepIndex))
      : base.stepIndex;

  return {
    scenarioTitle:
      typeof row.scenarioTitle === "string" && row.scenarioTitle.trim()
        ? row.scenarioTitle.trim().slice(0, 400)
        : base.scenarioTitle,
    stepIndex,
    stepTotal,
    scenarioHealth:
      typeof row.scenarioHealth === "number"
        ? Math.min(100, Math.max(0, Math.round(row.scenarioHealth)))
        : base.scenarioHealth,
    currentChallenge:
      typeof row.currentChallenge === "string" && row.currentChallenge.trim()
        ? row.currentChallenge.trim().slice(0, 1200)
        : base.currentChallenge,
    difficultyLevel:
      row.difficultyLevel === "beginner" ||
      row.difficultyLevel === "intermediate" ||
      row.difficultyLevel === "advanced"
        ? row.difficultyLevel
        : base.difficultyLevel,
  };
}

export function openingAdaptiveFeedback(topic: string): string {
  const title = buildScenarioTitle(topic);
  return `${title} Work through 3 short steps. Start with step 1 only.`;
}

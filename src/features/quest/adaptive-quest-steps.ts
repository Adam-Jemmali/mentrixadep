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
  return `You're coaching someone through ${label} using a real-world analogy — each step connects the scenario back to the idea behind their question.`;
}

export function buildScenarioPrinciple(topic: string): string {
  const label = cleanTopicLabel(topic);
  return `Core principle: build step-by-step understanding of ${label} through a relevant analogy, then answer the original question directly.`;
}

export function buildStepChallenge(topic: string, stepIndex: number, stepTotal = ADAPTIVE_STEP_TOTAL): string {
  const label = cleanTopicLabel(topic);
  const originalQ = topic.trim().slice(0, 400);

  if (stepIndex <= 1) {
    return `Step 1 of ${stepTotal}: Pick a familiar real-world situation that works like ${label}. In 2–3 sentences, explain which part of that analogy maps to the core idea behind the question.`;
  }
  if (stepIndex === 2) {
    return `Step 2 of ${stepTotal}: Stay in your analogy — walk through one small decision step by step. What would you check or do first, and why? Tie each step back to ${label}.`;
  }
  return `Step 3 of ${stepTotal}: Answer the original question directly: "${originalQ}" Give a complete answer that would pass on an exam or assignment, using what the analogy taught you.`;
}

export function createOpeningWorldState(topic: string): AdaptiveWorldState {
  return {
    scenarioTitle: buildScenarioTitle(topic),
    scenarioPrinciple: buildScenarioPrinciple(topic),
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
      feedback: `Step ${prior.stepIndex} still needs more detail. Re-read the scenario principle, then try again: ${prior.currentChallenge}`,
    };
  }

  if (prior.stepIndex >= prior.stepTotal) {
    return {
      worldState: {
        ...prior,
        scenarioHealth: 100,
        currentChallenge: "Challenge complete — you answered the original question.",
      },
      isResolved: true,
      feedback: "You worked through the analogy and answered the original question. Challenge complete.",
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
      ? "You worked through the analogy and answered the original question. Challenge complete."
      : nextStep === prior.stepTotal
        ? `Step ${prior.stepIndex} complete. Final step: answer the original question directly.`
        : `Step ${prior.stepIndex} complete. Step ${nextStep} goes deeper in the same analogy.`,
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
    scenarioPrinciple:
      typeof row.scenarioPrinciple === "string" && row.scenarioPrinciple.trim()
        ? row.scenarioPrinciple.trim().slice(0, 600)
        : base.scenarioPrinciple,
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

export function normalizePriorWorldState(raw: unknown, topic: string): AdaptiveWorldState | null {
  if (!raw || typeof raw !== "object") return null;
  return normalizeAdaptiveWorldState(raw, null, topic);
}

export function openingAdaptiveFeedback(topic: string): string {
  const title = buildScenarioTitle(topic);
  const principle = buildScenarioPrinciple(topic);
  return `${title} ${principle} Three steps: two build understanding through the analogy, then you answer the original question to pass. Start with step 1.`;
}

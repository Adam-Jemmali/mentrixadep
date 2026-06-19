/**
 * Multi-turn adaptive challenge AI for Classic Solver (Tab 2).
 */

import {
  type AiErrorResult,
  sanitizeForPrompt,
  containsPii,
  generateJson,
  stripMarkdownJson,
  handleAiError,
  enforceAiRateLimit,
  incrementDailyLimit,
} from "./shared";
import {
  advanceAdaptiveWorldState,
  createOpeningWorldState,
  isSubstantiveAdaptiveAnswer,
  normalizeAdaptiveWorldState,
  openingAdaptiveFeedback,
} from "@/features/quest/adaptive-quest-steps";

export type AdaptiveDifficultyLevel = "beginner" | "intermediate" | "advanced";

export type AdaptiveWorldState = {
  scenarioTitle: string;
  stepIndex: number;
  stepTotal: number;
  scenarioHealth: number;
  currentChallenge: string;
  difficultyLevel: AdaptiveDifficultyLevel;
};

export type AdaptiveTurnResponse = {
  feedback: string;
  updatedWorldState: AdaptiveWorldState;
  isResolved: boolean;
};

export type AdaptiveTurnParams = {
  subject: string;
  problemPrompt: string;
  message: string;
  priorWorldState: AdaptiveWorldState | null;
};

export function buildAdaptiveTurnFallback(
  message: string,
  priorWorldState: AdaptiveWorldState | null,
  problemPrompt?: string
): AdaptiveTurnResponse {
  const topic = (problemPrompt ?? message).trim();

  if (!priorWorldState) {
    const worldState = createOpeningWorldState(topic);
    return {
      feedback: openingAdaptiveFeedback(topic),
      updatedWorldState: worldState,
      isResolved: false,
    };
  }

  const accepted = isSubstantiveAdaptiveAnswer(message);
  const progressed = advanceAdaptiveWorldState(priorWorldState, topic, accepted);
  return {
    feedback: progressed.feedback,
    updatedWorldState: progressed.worldState,
    isResolved: progressed.isResolved,
  };
}

export async function generateAdaptiveTurn(
  params: AdaptiveTurnParams,
  userId: string
): Promise<AdaptiveTurnResponse | AiErrorResult> {
  try {
    await enforceAiRateLimit(userId, "quest.ai");

    const daily = await incrementDailyLimit(userId, "quest_gen");
    if (!daily.allowed) {
      return { error: true, message: "Daily quest limit reached (10/day). Come back tomorrow!" };
    }

    const subject = sanitizeForPrompt(params.subject).slice(0, 120);
    const problemPrompt = sanitizeForPrompt(params.problemPrompt).slice(0, 4000);
    const message = sanitizeForPrompt(params.message).slice(0, 4000);
    const isOpeningTurn = params.priorWorldState === null;
    const stateJson = JSON.stringify(params.priorWorldState);

    const systemPrompt = isOpeningTurn
      ? `You run a 3-step teaching scenario for this learner question:
"${problemPrompt}"
Study context: ${subject}.

FIRST TURN:
- Set scenarioTitle to a concrete situation (peer study, interview prep, tutoring session).
- Set stepIndex to 1 and stepTotal to 3.
- currentChallenge must be "Step 1 of 3: ..." with one focused task only.
- feedback introduces the scenario in plain language (max 220 chars).
- isResolved must be false.

JSON only:
{
  "feedback": string,
  "updatedWorldState": {
    "scenarioTitle": string,
    "stepIndex": number,
    "stepTotal": 3,
    "scenarioHealth": number,
    "currentChallenge": string,
    "difficultyLevel": "beginner" | "intermediate" | "advanced"
  },
  "isResolved": boolean
}`
      : `You run a 3-step teaching scenario for:
"${problemPrompt}"
Study context: ${subject}.
Current state: ${stateJson}
Learner answer for current step: ${message}

RULES:
- If the learner answer is substantive for the current step, accept it:
  - increment stepIndex
  - set a NEW currentChallenge for the next step (never repeat the same challenge text)
  - feedback: "Step N complete. Now do step N+1." style, max 220 chars
- If answer is weak or off-topic, keep same stepIndex and give one specific hint.
- If stepIndex reaches stepTotal and the final answer is substantive, set isResolved true.
- Never ask them to re-explain the whole topic after they already completed a step.

JSON only:
{
  "feedback": string,
  "updatedWorldState": {
    "scenarioTitle": string,
    "stepIndex": number,
    "stepTotal": number,
    "scenarioHealth": number,
    "currentChallenge": string,
    "difficultyLevel": "beginner" | "intermediate" | "advanced"
  },
  "isResolved": boolean
}`;

    const userContent = isOpeningTurn
      ? `Learner question:\n${problemPrompt}`
      : `Learner answer:\n${message}`;

    const raw = await generateJson(systemPrompt, userContent);

    if (containsPii(raw)) {
      return { error: true, message: "AI response contained unexpected content. Please try again." };
    }

    const jsonStr = stripMarkdownJson(raw);
    let parsed: {
      feedback?: string;
      updatedWorldState?: unknown;
      isResolved?: boolean;
    };
    try {
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      return { error: true, message: "Failed to parse AI response." };
    }

    const normalized = normalizeAdaptiveWorldState(
      parsed.updatedWorldState,
      params.priorWorldState,
      problemPrompt
    );

    const feedback =
      typeof parsed.feedback === "string" && parsed.feedback.trim()
        ? parsed.feedback.trim().slice(0, 600)
        : isOpeningTurn
          ? openingAdaptiveFeedback(problemPrompt)
          : "Step updated.";

    const isResolved = isOpeningTurn ? false : parsed.isResolved === true;

    return {
      feedback,
      updatedWorldState: normalized,
      isResolved,
    };
  } catch (err) {
    return handleAiError(err, "generateAdaptiveTurn", params.message.slice(0, 200));
  }
}

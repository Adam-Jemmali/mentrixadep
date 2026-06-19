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
  /** One sentence: the core principle the scenario analogies teach toward the learner's question. */
  scenarioPrinciple: string;
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
      ? `You run a 3-step scenario challenge for this learner question:
"${problemPrompt}"
Study context: ${subject}.

PEDAGOGY (required):
- Use a MEANINGFUL ANALOGY: a concrete everyday situation (workshop, kitchen, sports, commute, clinic, code review, etc.) that maps step-by-step to the concept in the learner's question — not a generic "classmate asks" frame unless the analogy itself is vivid.
- scenarioPrinciple: ONE clear sentence naming the core principle or skill the scenario teaches — must tie directly to the learner's question.
- scenarioTitle: the vivid analogy scenario (what situation the learner is "in").
- Steps 1–2 stay inside the analogy so the learner THINKS and UNDERSTANDS before answering.
- Step 3 MUST require answering the ORIGINAL question verbatim: "Answer the original question: ${problemPrompt.slice(0, 500)}" — that final answer is how they pass.

FIRST TURN:
- stepIndex 1, stepTotal 3
- currentChallenge: "Step 1 of 3: ..." — map one part of the analogy to the principle (one focused task only)
- feedback: introduce scenario + state the principle plainly (max 260 chars)
- isResolved: false

JSON only:
{
  "feedback": string,
  "updatedWorldState": {
    "scenarioTitle": string,
    "scenarioPrinciple": string,
    "stepIndex": number,
    "stepTotal": 3,
    "scenarioHealth": number,
    "currentChallenge": string,
    "difficultyLevel": "beginner" | "intermediate" | "advanced"
  },
  "isResolved": boolean
}`
      : `You run a 3-step scenario challenge for:
"${problemPrompt}"
Study context: ${subject}.
Current state: ${stateJson}
Learner answer for current step: ${message}

PEDAGOGY (required):
- Keep scenarioTitle and scenarioPrinciple consistent with the opening turn.
- Step 1 → Step 2: extend the SAME analogy with a concrete mini-decision (walk through one choice step by step).
- Step 2 → Step 3: currentChallenge MUST begin "Step 3 of 3: Answer the original question:" and quote "${problemPrompt.slice(0, 500)}" — learner must give a complete, gradable answer to pass.
- Steps 1–2 build understanding via the analogy; step 3 is the real answer to the question asked.

RULES:
- If the learner answer is substantive for the current step, accept it:
  - increment stepIndex
  - set a NEW currentChallenge for the next step (never repeat challenge text)
  - feedback: "Step N complete." + what step N+1 focuses on (max 260 chars)
- If answer is weak or off-topic, keep same stepIndex; hint must reference the analogy or scenarioPrinciple.
- isResolved true ONLY when stepIndex was stepTotal AND the learner's answer substantively answers the original question "${problemPrompt.slice(0, 500)}".
- Never ask them to re-explain the whole topic after they already completed a step.

JSON only:
{
  "feedback": string,
  "updatedWorldState": {
    "scenarioTitle": string,
    "scenarioPrinciple": string,
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

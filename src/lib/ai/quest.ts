/**
 * Quest AI — explanation generation, streaming, variants, answer evaluation.
 */

import {
  type AiErrorResult,
  type AiParseError,
  sanitizeForPrompt,
  containsPii,
  isCircuitOpen,
  recordCircuitSuccess,
  recordCircuitFailure,
  CIRCUIT_OPEN_ERROR,
  MENTRIXA_SYSTEM_GUARD,
  enforceAiRateLimit,
  incrementDailyLimit,
  generateJson,
  stripMarkdownJson,
  getClient,
  handleAiError,
  reportAiFailure,
} from "./shared";

// ============================================
// TYPES
// ============================================

export interface QuestExplanationRequest {
  prompt: string;
  goal: "exam" | "interview" | "assignment";
  mode: "coach" | "exam";
}

export interface QuestExplanationResponse {
  hints: string[];
  reasoning: string;
  finalAnswer: string;
}

export interface QuestVariant {
  prompt: string;
  metadata: Record<string, unknown>;
}

export interface EvaluateAnswerRequest {
  problem: string;
  correctAnswer: string;
  userAnswer: string;
  goal: "exam" | "interview" | "assignment";
  mode: "coach" | "exam";
}

export interface EvaluateAnswerResponse {
  correct: boolean;
  feedback?: string;
}

// ============================================
// INTERNAL HELPERS
// ============================================

const GOAL_MODE_INSTRUCTIONS: Record<string, Record<string, string>> = {
  exam: {
    exam: "Exam prep, exam mode: hints only (no solution shown to student). Generate hints that lead toward the answer without giving it away. Still produce reasoning and finalAnswer for internal grading.",
    coach: "Exam prep, coach mode: full hints, reasoning, and solution. Student will work with hints first then can reveal explanation.",
  },
  interview: {
    exam: "Interview prep, exam mode: hints toward a verbal/key-point answer. Student must articulate their approach. Produce reasoning and finalAnswer for grading.",
    coach: "Interview prep, coach mode: hints, reasoning, and a model answer (concise key points or verbal script).",
  },
  assignment: {
    exam: "Assignment help, exam mode: hints only. Student must derive the solution. Produce reasoning and finalAnswer for grading.",
    coach: "Assignment help, coach mode: full step-by-step reasoning and complete solution (code, proof, or worked solution).",
  },
};

// ============================================
// EXPORTED FUNCTIONS
// ============================================

export async function generateExplanation(
  req: QuestExplanationRequest,
  userId: string
): Promise<QuestExplanationResponse | AiErrorResult> {
  try {
    await enforceAiRateLimit(userId, "quest.ai");

    const daily = await incrementDailyLimit(userId, "quest_gen");
    if (!daily.allowed) {
      return { error: true, message: "Daily quest limit reached (10/day). Come back tomorrow!" };
    }

    const prompt = sanitizeForPrompt(req.prompt);
    const goalInst =
      GOAL_MODE_INSTRUCTIONS[req.goal]?.[req.mode] ??
      "Return hints (3-5), reasoning, and finalAnswer as JSON.";

    const systemPrompt = `You are an expert tutor. Given a problem, return a JSON object with:
- hints: array of 3-5 ordered hints (most subtle to most direct)
- reasoning: step-by-step explanation
- finalAnswer: complete solution

Context: ${goalInst}
Return only valid JSON, no markdown.`;
    const userContent = `Goal: ${req.goal}. Mode: ${req.mode}.\n\nProblem:\n${prompt}`;

    const raw = await generateJson(systemPrompt, userContent);

    if (containsPii(raw)) {
      return { error: true, message: "AI response contained unexpected content. Please try again." };
    }

    const jsonStr = stripMarkdownJson(raw);
    let parsed: { hints?: string[]; reasoning?: string; finalAnswer?: string };
    try {
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      throw Object.assign(new Error("Invalid JSON from AI"), { type: "parse_error" as const });
    }

    const hints = Array.isArray(parsed.hints)
      ? parsed.hints.filter((h) => typeof h === "string")
      : [];
    const reasoning =
      req.mode === "exam"
        ? ""
        : (typeof parsed.reasoning === "string" ? parsed.reasoning : "") || "";
    const finalAnswer =
      typeof parsed.finalAnswer === "string" ? parsed.finalAnswer : "";

    return { hints, reasoning, finalAnswer };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "type" in err &&
      (err as AiParseError).type === "parse_error"
    ) {
      return { error: true, message: "Failed to parse AI response." };
    }
    return handleAiError(err, "generateExplanation", req.prompt.slice(0, 200));
  }
}

export function streamExplanation(
  req: QuestExplanationRequest,
  userId: string
): ReadableStream<string> {
  let cancelled = false;

  return new ReadableStream<string>({
    async start(controller) {
      try {
        await enforceAiRateLimit(userId, "quest.ai.stream");

        if (isCircuitOpen()) {
          controller.error(new Error(CIRCUIT_OPEN_ERROR));
          return;
        }

        const prompt = sanitizeForPrompt(req.prompt);
        const goalInst =
          GOAL_MODE_INSTRUCTIONS[req.goal]?.[req.mode] ??
          "Return hints (3-5), reasoning, and finalAnswer as JSON.";

        const fullSystem = `${MENTRIXA_SYSTEM_GUARD}

You are an expert tutor. Given a problem, return a JSON object with:
- hints: array of 3-5 ordered hints (most subtle to most direct)
- reasoning: step-by-step explanation
- finalAnswer: complete solution

Context: ${goalInst}
Return only valid JSON, no markdown.`;

        const userContent = `Goal: ${req.goal}. Mode: ${req.mode}.\n\nProblem:\n${prompt}`;
        const client = getClient();

        const stream = await client.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents: userContent,
          config: {
            systemInstruction: fullSystem,
            responseMimeType: "application/json",
          },
        });

        let buffer = "";
        for await (const chunk of stream) {
          if (cancelled) break;
          const t =
            typeof (chunk as { text?: string }).text === "string"
              ? (chunk as { text: string }).text
              : "";
          if (t) {
            buffer += t;
            controller.enqueue(t);
          }
        }

        if (containsPii(buffer)) {
          controller.error(new Error("AI response contained unexpected content."));
          return;
        }

        recordCircuitSuccess();
        controller.close();
      } catch (err) {
        recordCircuitFailure();
        reportAiFailure("streamExplanation", err, req.prompt.slice(0, 200));
        controller.error(err);
      }
    },
    cancel() {
      cancelled = true;
    },
  });
}

export async function generateVariants(
  originalPrompt: string,
  userId: string
): Promise<QuestVariant[] | AiErrorResult> {
  try {
    await enforceAiRateLimit(userId, "quest.ai");

    const daily = await incrementDailyLimit(userId, "quest_gen");
    if (!daily.allowed) {
      return { error: true, message: "Daily quest limit reached (10/day). Come back tomorrow!" };
    }

    const prompt = sanitizeForPrompt(originalPrompt);

    const systemPrompt =
      "Given this problem, generate 3 similar problems at the same or slightly higher difficulty. Return a JSON array of objects with: prompt (string), metadata (object with difficulty: easy|medium|hard and tags: string[]). Return only valid JSON.";
    const raw = await generateJson(systemPrompt, prompt);

    if (containsPii(raw)) {
      return { error: true, message: "AI response contained unexpected content. Please try again." };
    }

    const jsonStr = stripMarkdownJson(raw);
    let arr: unknown[];
    try {
      arr = JSON.parse(jsonStr) as unknown[];
    } catch {
      return { error: true, message: "Failed to parse AI response." };
    }

    if (!Array.isArray(arr)) {
      return { error: true, message: "AI did not return an array." };
    }

    const variants: QuestVariant[] = [];
    for (const item of arr.slice(0, 3)) {
      if (
        item &&
        typeof item === "object" &&
        "prompt" in item &&
        typeof (item as QuestVariant).prompt === "string"
      ) {
        const v = item as { prompt: string; metadata?: Record<string, unknown> };
        variants.push({
          prompt: v.prompt,
          metadata: v.metadata && typeof v.metadata === "object" ? v.metadata : {},
        });
      }
    }
    return variants;
  } catch (err) {
    return handleAiError(err, "generateVariants", originalPrompt.slice(0, 200));
  }
}

export async function evaluateAnswer(
  req: EvaluateAnswerRequest,
  userId: string
): Promise<EvaluateAnswerResponse | AiErrorResult> {
  try {
    await enforceAiRateLimit(userId, "quest.ai");
    const problem = sanitizeForPrompt(req.problem).slice(0, 2000);
    const correctAnswer = sanitizeForPrompt(req.correctAnswer).slice(0, 2000);
    const userAnswer = sanitizeForPrompt(req.userAnswer).slice(0, 2000);

    const modeHint =
      req.goal === "interview"
        ? "Accept verbal summaries, key points, or concise explanations. Be lenient on wording."
        : req.goal === "assignment"
          ? "Accept code, proofs, or worked solutions that match the key steps. Minor notation differences OK."
          : "Be strict: accept answers that correctly solve the problem. Allow equivalent formulations.";

    const systemPrompt = `You are a tutor grading a student's answer. Given the problem, correct solution, and student answer, return JSON:
{ "correct": boolean, "feedback": string }
- correct: true only if the student's answer is substantively correct.
- feedback: if correct is false, give brief constructive feedback. If correct, optional encouragement.
${modeHint}
Return only valid JSON.`;
    const userContent = `Problem:\n${problem}\n\nCorrect answer:\n${correctAnswer}\n\nStudent answer:\n${userAnswer}`;

    const raw = await generateJson(systemPrompt, userContent);

    if (containsPii(raw)) {
      return { error: true, message: "AI response contained unexpected content. Please try again." };
    }

    const jsonStr = stripMarkdownJson(raw);
    let parsed: { correct?: boolean; feedback?: string };
    try {
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      return { error: true, message: "Failed to parse grading response." };
    }

    return {
      correct: Boolean(parsed.correct),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : undefined,
    };
  } catch (err) {
    return handleAiError(err, "evaluateAnswer", req.problem.slice(0, 200));
  }
}

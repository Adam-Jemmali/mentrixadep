/**
 * AI utility module (Quest system) — server-only.
 * Uses Gemini for explanations, variants, and session summaries.
 * Do not import from client components; use only in server actions or server code.
 */

import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "@/lib/env";
import {
  enforceRateLimit,
  getRateLimitId,
  RATE_LIMITS,
  sanitizeString,
} from "@/lib/security";
import { reportGeminiRateLimited } from "@/lib/observability";

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

export interface SessionPackageResponse {
  summary: string;
  keyPoints: string[];
  flashcards: { q: string; a: string }[];
  followupPrompts: string[];
}

/** Rich context for session packages (recordings, quests, prior sessions). */
export interface SessionPackageRichContext {
  course: string;
  durationMinutes: number;
  /** Human-readable session window, e.g. ISO or local date */
  sessionWhen?: string;
  /** Extra paragraphs for the model (recording status, quest history, prior summaries, rating comment). */
  contextBlocks: string[];
}

export type AiErrorResult = { error: true; message: string };

export type AiParseError = { type: "parse_error" };

// ============================================
// HELPERS
// ============================================

const AI_TIMEOUT_MS = 15_000;
/** Longer timeout for session package JSON (rich context). */
const SESSION_PACKAGE_TIMEOUT_MS = 60_000;

function getClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getGeminiApiKey() });
}

async function generateJson(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number = AI_TIMEOUT_MS,
): Promise<string> {
  const client = getClient();
  const timeoutPromise = new Promise<never>((_, reject) => {
    const err = new Error("Request timed out");
    (err as Error & { name: string }).name = "AbortError";
    setTimeout(() => reject(err), timeoutMs);
  });
  const requestPromise = client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
    },
  });
  const res = await Promise.race([requestPromise, timeoutPromise]);
  const text = (res as { text?: string }).text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Empty or invalid AI response");
  }
  return text.trim();
}

function stripMarkdownJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// ============================================
// EXPORTED FUNCTIONS
// ============================================

// Goal/mode-specific instructions for AI explanation
const GOAL_MODE_INSTRUCTIONS: Record<string, Record<string, string>> = {
  exam: {
    exam:
      "Exam prep, exam mode: hints only (no solution shown to student). Generate hints that lead toward the answer without giving it away. Still produce reasoning and finalAnswer for internal grading.",
    coach:
      "Exam prep, coach mode: full hints, reasoning, and solution. Student will work with hints first then can reveal explanation.",
  },
  interview: {
    exam:
      "Interview prep, exam mode: hints toward a verbal/key-point answer. Student must articulate their approach. Produce reasoning and finalAnswer for grading.",
    coach:
      "Interview prep, coach mode: hints, reasoning, and a model answer (concise key points or verbal script).",
  },
  assignment: {
    exam:
      "Assignment help, exam mode: hints only. Student must derive the solution. Produce reasoning and finalAnswer for grading.",
    coach:
      "Assignment help, coach mode: full step-by-step reasoning and complete solution (code, proof, or worked solution).",
  },
};

/**
 * Generate hints, reasoning, and final answer for a quest problem.
 * Output varies by goal and mode. In exam mode, solution is kept server-side for grading (not shown to user).
 */
export async function generateExplanation(
  req: QuestExplanationRequest,
  userId: string
): Promise<QuestExplanationResponse | AiErrorResult> {
  try {
    enforceRateLimit(
      getRateLimitId(userId),
      RATE_LIMITS.questAi,
      "quest.ai"
    );
    const prompt = sanitizeString(req.prompt);
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

    const jsonStr = stripMarkdownJson(raw);
    let parsed: { hints?: string[]; reasoning?: string; finalAnswer?: string };
    try {
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      throw Object.assign(new Error("Invalid JSON from AI"), {
        type: "parse_error" as const,
      });
    }

    const hints = Array.isArray(parsed.hints)
      ? parsed.hints.filter((h) => typeof h === "string")
      : [];
    const reasoning =
      req.mode === "exam"
        ? ""
        : (typeof parsed.reasoning === "string" ? parsed.reasoning : "") || "";
    const finalAnswer =
      typeof parsed.finalAnswer === "string"
        ? parsed.finalAnswer
        : "";

    return {
      hints,
      reasoning,
      finalAnswer,
    };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "type" in err &&
      (err as AiParseError).type === "parse_error"
    ) {
      return { error: true, message: "Failed to parse AI response." };
    }
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return { error: true, message: "Request timed out. Please try again." };
      }
      if (err.message.includes("Rate limit")) {
        reportGeminiRateLimited("generateExplanation", err.message);
        return { error: true, message: err.message };
      }
      // Surface actual error so user sees e.g. missing GEMINI_API_KEY or API errors
      return { error: true, message: err.message };
    }
    return { error: true, message: "An unexpected error occurred." };
  }
}

/**
 * Generate 3 similar problems (variants) from an original prompt.
 */
export async function generateVariants(
  originalPrompt: string,
  userId: string
): Promise<QuestVariant[] | AiErrorResult> {
  try {
    enforceRateLimit(
      getRateLimitId(userId),
      RATE_LIMITS.questAi,
      "quest.ai"
    );
    const prompt = sanitizeString(originalPrompt);

    const systemPrompt =
      "Given this problem, generate 3 similar problems at the same or slightly higher difficulty. Return a JSON array of objects with: prompt (string), metadata (object with difficulty: easy|medium|hard and tags: string[]). Return only valid JSON.";
    const raw = await generateJson(systemPrompt, prompt);

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
          metadata:
            v.metadata && typeof v.metadata === "object"
              ? v.metadata
              : {},
        });
      }
    }
    return variants;
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return { error: true, message: "Request timed out. Please try again." };
      }
      if (err.message.includes("Rate limit")) {
        reportGeminiRateLimited("generateVariants", err.message);
        return { error: true, message: err.message };
      }
      return { error: true, message: err.message };
    }
    return { error: true, message: "An unexpected error occurred." };
  }
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

/**
 * Evaluate a student's answer against the correct solution.
 * Criteria vary by goal/mode: exam=strict, interview=key points, assignment=step-by-step or code.
 */
export async function evaluateAnswer(
  req: EvaluateAnswerRequest,
  userId: string
): Promise<EvaluateAnswerResponse | AiErrorResult> {
  try {
    enforceRateLimit(
      getRateLimitId(userId),
      RATE_LIMITS.questAi,
      "quest.ai"
    );
    const problem = sanitizeString(req.problem).slice(0, 2000);
    const correctAnswer = sanitizeString(req.correctAnswer).slice(0, 2000);
    const userAnswer = sanitizeString(req.userAnswer).slice(0, 2000);

    const modeHint =
      req.goal === "interview"
        ? "Accept verbal summaries, key points, or concise explanations. Be lenient on wording."
        : req.goal === "assignment"
          ? "Accept code, proofs, or worked solutions that match the key steps. Minor notation differences OK."
          : "Be strict: accept answers that correctly solve the problem. Allow equivalent formulations.";

    const systemPrompt = `You are a tutor grading a student's answer. Given the problem, correct solution, and student answer, return JSON:
{ "correct": boolean, "feedback": string }
- correct: true only if the student's answer is substantively correct (equivalent to or captures the key insight of the correct answer).
- feedback: if correct is false, give brief constructive feedback. If correct, optional encouragement.
${modeHint}
Return only valid JSON.`;
    const userContent = `Problem:\n${problem}\n\nCorrect answer:\n${correctAnswer}\n\nStudent answer:\n${userAnswer}`;

    const raw = await generateJson(systemPrompt, userContent);
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
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return { error: true, message: "Request timed out. Please try again." };
      }
      if (err.message.includes("Rate limit")) {
        reportGeminiRateLimited("evaluateAnswer", err.message);
        return { error: true, message: err.message };
      }
      return { error: true, message: err.message };
    }
    return { error: true, message: "An unexpected error occurred." };
  }
}

/**
 * Summarize a tutoring session and produce key points, flashcards, and follow-up prompts.
 * Uses course, timing, optional video-recording signals, learner quest history, and prior session summaries when provided.
 */
export async function summarizeSession(
  context: SessionPackageRichContext,
  userId: string
): Promise<SessionPackageResponse | AiErrorResult> {
  try {
    enforceRateLimit(
      getRateLimitId(userId),
      RATE_LIMITS.questAi,
      "quest.ai"
    );
    const course = sanitizeString(context.course);
    const durationMinutes = Number(context.durationMinutes) || 0;
    const blocks = Array.isArray(context.contextBlocks)
      ? context.contextBlocks.map((b) => sanitizeString(b).slice(0, 8000))
      : [];

    const systemPrompt = `You are a tutoring session summarizer for Mentrixa. You may receive:
- Course and scheduled duration (the live 1:1 video session window).
- Whether a video recording was saved (you do NOT receive raw video/audio—only metadata).
- The learner's recent Mentrixa Quest practice topics.
- Summaries from earlier sessions with the same tutor (continuity).
- Optional learner rating comment after the session.

Infer what was likely covered and align follow-up work with the learner's trajectory. If there is no recording, say so implicitly in the summary only if relevant—do not claim you watched a recording.

Output JSON only with:
- summary: string (2-4 sentences)
- keyPoints: string[] (4-8 bullets of substance covered or goals for this session)
- flashcards: { "q": string, "a": string }[] (4-8 items tied to the course and context)
- followupPrompts: string[] (3-5 short practice prompts building on keyPoints and quest themes)`;

    const when = context.sessionWhen?.trim() || "scheduled session";
    const userContent = [
      `Course: ${course}.`,
      `Session window: ${when}. Approximate duration: ${durationMinutes} minutes.`,
      ...blocks.map((b) => `\n---\n${b}`),
    ].join("\n");

    const raw = await generateJson(systemPrompt, userContent, SESSION_PACKAGE_TIMEOUT_MS);

    const jsonStr = stripMarkdownJson(raw);
    let parsed: {
      summary?: string;
      keyPoints?: string[];
      flashcards?: { q?: string; a?: string }[];
      followupPrompts?: string[];
    };
    try {
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      return { error: true, message: "Failed to parse AI response." };
    }

    const summary =
      typeof parsed.summary === "string" ? parsed.summary : "";
    const keyPoints = Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.filter((k) => typeof k === "string")
      : [];
    const flashcards = Array.isArray(parsed.flashcards)
      ? parsed.flashcards
          .filter(
            (f) =>
              f &&
              typeof f === "object" &&
              typeof (f as { q?: string }).q === "string" &&
              typeof (f as { a?: string }).a === "string"
          )
          .map((f) => ({ q: (f as { q: string }).q, a: (f as { a: string }).a }))
      : [];
    const followupPrompts = Array.isArray(parsed.followupPrompts)
      ? parsed.followupPrompts.filter((p) => typeof p === "string")
      : [];

    return {
      summary,
      keyPoints,
      flashcards,
      followupPrompts,
    };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return { error: true, message: "Request timed out. Please try again." };
      }
      if (err.message.includes("Rate limit")) {
        reportGeminiRateLimited("summarizeSession", err.message);
        return { error: true, message: err.message };
      }
      return { error: true, message: err.message };
    }
    return { error: true, message: "An unexpected error occurred." };
  }
}

// ============================================
// SKILL DUEL (1v1 MCQ)
// ============================================

export interface DuelQuestionPayload {
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** mcq = 4-option quiz; tf = True/False; flashcard = term/concept with 4 plausible meanings. */
  type: "mcq" | "tf" | "flashcard";
}

function normalizeTfChoices(
  choices: string[],
  correctIndex: number
): { choices: string[]; correctIndex: number } | null {
  const lower = choices.map((c) => c.trim().toLowerCase());
  const hasTrue = lower.some((c) => c === "true" || c === "t");
  const hasFalse = lower.some((c) => c === "false" || c === "f");
  if (choices.length !== 2 || !hasTrue || !hasFalse) return null;
  const trueIdx = lower.findIndex((c) => c === "true" || c === "t");
  const falseIdx = lower.findIndex((c) => c === "false" || c === "f");
  if (trueIdx < 0 || falseIdx < 0) return null;
  const ordered = ["True", "False"];
  let newCorrect = correctIndex;
  if (correctIndex === trueIdx) newCorrect = 0;
  else if (correctIndex === falseIdx) newCorrect = 1;
  else return null;
  return { choices: ordered, correctIndex: newCorrect };
}

/**
 * Generate a mixed set (quiz MCQ, true/false, flashcard-style) for a tutor–student duel.
 */
export async function generateDuelQuestions(
  divisionName: string,
  divisionKey: string,
  userId: string,
  count: number = 5
): Promise<{ questions: DuelQuestionPayload[] } | AiErrorResult> {
  try {
    enforceRateLimit(
      getRateLimitId(userId),
      RATE_LIMITS.questAi,
      "duel.questions"
    );
    const n = Math.max(3, Math.min(8, count));
    const systemPrompt = `You write duel questions for tutoring (two humans compete on the same items). Return JSON only:
{ "questions": [ {
  "type": "mcq" | "tf" | "flashcard",
  "prompt": string,
  "choices": string[],
  "correctIndex": number
} ] }

Types:
- "mcq": standard multiple choice — exactly 4 distinct choices; correctIndex 0–3.
- "tf": exactly two choices, which must be the strings "True" and "False" only (in any order in the array); correctIndex 0 or 1.
- "flashcard": prompt is a term or concept; choices are exactly 4 short plausible definitions/meanings (one correct); correctIndex 0–3.

Rules:
- Exactly ${n} questions about ${divisionName} (key: ${divisionKey}) at undergraduate intro level.
- Include a mix: at least one "tf", at least one "flashcard", rest "mcq" if ${n} >= 3.
- No trick wording; fair for both participants.
- correctIndex is always 0-based index into the choices array for that question.`;

    const raw = await generateJson(
      systemPrompt,
      `Generate exactly ${n} questions with the required type mix.`,
      SESSION_PACKAGE_TIMEOUT_MS
    );
    const jsonStr = stripMarkdownJson(raw);
    let parsed: { questions?: unknown[] };
    try {
      parsed = JSON.parse(jsonStr) as { questions?: unknown[] };
    } catch {
      return { error: true, message: "Failed to parse duel questions." };
    }
    const arr = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions: DuelQuestionPayload[] = [];
    for (const item of arr.slice(0, n)) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const rawType = o.type === "tf" || o.type === "flashcard" || o.type === "mcq" ? o.type : null;
      const prompt = typeof o.prompt === "string" ? o.prompt.trim() : "";
      const choicesRaw = Array.isArray(o.choices)
        ? o.choices
            .filter((c) => typeof c === "string")
            .map((c) => (c as string).trim())
        : [];
      const ci = typeof o.correctIndex === "number" ? Math.floor(o.correctIndex) : -1;
      if (prompt.length < 4 || choicesRaw.length === 0 || ci < 0) continue;

      let type: DuelQuestionPayload["type"] = rawType ?? "mcq";
      let choices = choicesRaw;
      let correctIndex = ci;

      if (type === "tf") {
        const norm = normalizeTfChoices(choices, correctIndex);
        if (!norm) continue;
        choices = norm.choices;
        correctIndex = norm.correctIndex;
      } else {
        if (choices.length !== 4 || correctIndex > 3) continue;
        type = type === "flashcard" ? "flashcard" : "mcq";
      }

      questions.push({ prompt, choices, correctIndex, type });
    }
    if (questions.length < 3) {
      return {
        error: true,
        message: "Could not generate enough valid questions. Try again.",
      };
    }
    return { questions };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return { error: true, message: "Request timed out. Please try again." };
      }
      if (err.message.includes("Rate limit")) {
        reportGeminiRateLimited("generateDuelQuestions", err.message);
        return { error: true, message: err.message };
      }
      return { error: true, message: err.message };
    }
    return { error: true, message: "An unexpected error occurred." };
  }
}

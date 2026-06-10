/**
 * Studio AI — session summaries, studio packages, recording analysis.
 */

import {
  enforceSlidingRateLimit,
  getRateLimitId,
  RATE_LIMITS,
} from "@/shared/core/security";
import {
  parseStudioPackageFromModelText,
  type NormalizedStudioPackage,
} from "@/features/studio-ai/studio-package-lib";

import {
  type AiErrorResult,
  type SessionPackageRichContext,
  sanitizeForPrompt,
  containsPii,
  isCircuitOpen,
  recordCircuitSuccess,
  recordCircuitFailure,
  CIRCUIT_OPEN_ERROR,
  MENTRIXA_SYSTEM_GUARD,
  enforceAiRateLimit,
  incrementDailyLimit,
  type DailyLimitAction,
  generateJson,
  stripMarkdownJson,
  parseModelJson,
  getClient,
  withBackoff,
  extractGeminiResponseText,
  handleAiError,
  reportAiFailure,
  SESSION_PACKAGE_TIMEOUT_MS,
  buildSessionCacheKey,
  getSessionPackageCache,
  setSessionPackageCache,
} from "./shared";

// ============================================
// TYPES
// ============================================

export interface SessionPackageResponse {
  summary: string;
  keyPoints: string[];
  flashcards: { q: string; a: string }[];
  followupPrompts: string[];
}

/** Re-export for server actions that map DB rows. */
export interface RecordingStudioInsights {
  transcriptExcerpt: string;
  screenShareSummary: string;
  keyTopics: string[];
  learnerQuestions: string[];
}

/** Re-export for server actions that map DB rows. */
export type { NormalizedStudioPackage } from "@/features/studio-ai/studio-package-lib";

export interface RecordingAnalysisResult {
  transcriptExcerpt: string;
  screenShareSummary: string;
  keyTopics: string[];
  learnerQuestions: string[];
}

// ============================================
// INTERNAL HELPERS
// ============================================

function buildStudioSessionPrompts(
  context: SessionPackageRichContext,
  tutorNotes?: string
): { systemPrompt: string; userContent: string } {
  const course = sanitizeForPrompt(context.course);
  const durationMinutes = Number(context.durationMinutes) || 0;
  const blocks = Array.isArray(context.contextBlocks)
    ? context.contextBlocks.map((b) => sanitizeForPrompt(b).slice(0, 8000))
    : [];
  const notes = tutorNotes?.trim()
    ? sanitizeForPrompt(tutorNotes).slice(0, 4000)
    : "";
  const when = context.sessionWhen?.trim() || "scheduled session";

  const systemPrompt = `You are Mentrixa Studio: you turn a live 1:1 tutoring session into a concise study package for the learner.
You may receive course, timing, recording metadata (never raw video), prior session summaries, Quest topics, rating comments, and optional notes from the guide about what was covered.

Output JSON only with exactly these keys:
- summary: string (2–4 sentences; practical, specific to this session)
- keyPoints: string[] (4–8 bullets of what mattered)
- flashcards: array of exactly 5 objects { "q": string, "a": string }
- practiceExercises: array of exactly 3 objects { "title": string, "prompt": string, "hint": string optional }
- followUpTopics: string[] (exactly 3 short topic labels)
- followupQuestPrompts: string[] (exactly 3 standalone prompts for independent Quest practice)

Rules:
- Tie content to the course and context; avoid generic filler.
- Do not claim you watched a recording unless metadata says a recording exists.
- If context is thin, still produce good-faith educational content aligned with the course name and guide notes.`;

  const userContent = [
    `Course: ${course}.`,
    `Session window: ${when}. Approximate duration: ${durationMinutes} minutes.`,
    notes ? `\nGuide notes (what was covered, struggles, emphasis):\n${notes}` : "",
    ...blocks.map((b) => `\n---\n${b}`),
  ].join("\n");

  return { systemPrompt, userContent };
}

function normalizeRecordingInsights(parsed: Partial<Record<string, unknown>>): RecordingAnalysisResult {
  const transcriptExcerpt = typeof parsed.transcriptExcerpt === "string" ? parsed.transcriptExcerpt.trim().slice(0, 4000) : "";
  const screenShareSummary = typeof parsed.screenShareSummary === "string" ? parsed.screenShareSummary.trim().slice(0, 2000) : "";
  const keyTopics = Array.isArray(parsed.keyTopics)
    ? parsed.keyTopics.filter((topic): topic is string => typeof topic === "string").map((topic) => topic.trim()).filter(Boolean).slice(0, 10)
    : [];
  const learnerQuestions = Array.isArray(parsed.learnerQuestions)
    ? parsed.learnerQuestions.filter((question): question is string => typeof question === "string").map((question) => question.trim()).filter(Boolean).slice(0, 10)
    : [];

  return {
    transcriptExcerpt,
    screenShareSummary,
    keyTopics,
    learnerQuestions,
  };
}

async function analyzeRecordingContext(
  input: { course: string; mimeType: string; base64Data?: string; fileUri?: string },
  userId: string
): Promise<RecordingAnalysisResult | AiErrorResult> {
  try {
    await enforceAiRateLimit(userId, "quest.ai");

    if (isCircuitOpen()) {
      return { error: true, message: CIRCUIT_OPEN_ERROR };
    }

    const course = sanitizeForPrompt(input.course).slice(0, 120);
    const systemPrompt = `You analyze a tutoring session recording and return JSON only:
{
  "transcriptExcerpt": string,
  "screenShareSummary": string,
  "keyTopics": string[],
  "learnerQuestions": string[]
}

Rules:
- transcriptExcerpt: 2-5 concise sentences summarizing the spoken session content.
- screenShareSummary: concise summary of what the learner likely saw or did on screen.
- keyTopics: 3-8 short topic labels.
- learnerQuestions: 0-10 short questions, misconceptions, or prompts from the learner.
- Keep the output grounded in the provided recording and course context.
- Return strict JSON only.`;

    const userContent = `Course: ${course}
MIME type: ${input.mimeType}
Recording source: ${input.fileUri ? "Gemini file URI" : "inline base64"}`;

    const client = getClient();
    const contents = input.fileUri
      ? [
          {
            role: "user" as const,
            parts: [
              { text: userContent },
              { fileData: { fileUri: input.fileUri, mimeType: input.mimeType } },
            ],
          },
        ]
      : [
          {
            role: "user" as const,
            parts: [
              { text: userContent },
              { inlineData: { mimeType: input.mimeType, data: input.base64Data ?? "" } },
            ],
          },
        ];

    const raw = await withBackoff(async () => {
      const response = await Promise.race([
        client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contents as never,
          config: {
            systemInstruction: `${MENTRIXA_SYSTEM_GUARD}\n\n${systemPrompt}`,
            responseMimeType: "application/json",
          },
        }),
        new Promise<never>((_, reject) => {
          const err = new Error("Request timed out");
          (err as Error & { name: string }).name = "AbortError";
          setTimeout(() => reject(err), SESSION_PACKAGE_TIMEOUT_MS);
        }),
      ]);
      return extractGeminiResponseText(response);
    });

    if (containsPii(raw)) {
      return { error: true, message: "AI response contained unexpected content. Please try again." };
    }

    const parsedResult = parseModelJson<Record<string, unknown>>(raw);
    if (!parsedResult.ok) {
      return { error: true, message: "Failed to parse recording analysis." };
    }

    return normalizeRecordingInsights(parsedResult.value);
  } catch (err) {
    return handleAiError(err, "analyzeRecordingContext", input.course.slice(0, 100));
  }
}

// ============================================
// EXPORTED FUNCTIONS
// ============================================

export async function summarizeSession(
  context: SessionPackageRichContext,
  userId: string
): Promise<SessionPackageResponse | AiErrorResult> {
  try {
    await enforceAiRateLimit(userId, "quest.ai");
    const course = sanitizeForPrompt(context.course);
    const durationMinutes = Number(context.durationMinutes) || 0;
    const blocks = Array.isArray(context.contextBlocks)
      ? context.contextBlocks.map((b) => sanitizeForPrompt(b).slice(0, 8000))
      : [];

    const systemPrompt = `You are a tutoring session summarizer for Mentrixa. You may receive course, timing, recording metadata, learner's recent Quest practice topics, prior session summaries, and optional learner rating comment.

Output JSON only with:
- summary: string (2-4 sentences)
- keyPoints: string[] (4-8 bullets)
- flashcards: { "q": string, "a": string }[] (4-8 items)
- followupPrompts: string[] (3-5 short practice prompts)`;

    const when = context.sessionWhen?.trim() || "scheduled session";
    const userContent = [
      `Course: ${course}.`,
      `Session window: ${when}. Approximate duration: ${durationMinutes} minutes.`,
      ...blocks.map((b) => `\n---\n${b}`),
    ].join("\n");

    const raw = await generateJson(systemPrompt, userContent, SESSION_PACKAGE_TIMEOUT_MS);

    if (containsPii(raw)) {
      return { error: true, message: "AI response contained unexpected content. Please try again." };
    }

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

    const summary = typeof parsed.summary === "string" ? parsed.summary : "";
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

    return { summary, keyPoints, flashcards, followupPrompts };
  } catch (err) {
    return handleAiError(err, "summarizeSession", context.course.slice(0, 100));
  }
}

export async function generateStudioSessionPackage(
  context: SessionPackageRichContext,
  tutorNotes: string | undefined,
  userId: string,
  isRegen = false
): Promise<NormalizedStudioPackage | AiErrorResult> {
  try {
    await enforceSlidingRateLimit(
      `${getRateLimitId(userId)}:studio-package`,
      RATE_LIMITS.studioPackageAi,
      "studio.package.generate",
    );

    const action: DailyLimitAction = isRegen ? "session_package_regen" : "session_package_gen";
    const daily = await incrementDailyLimit(userId, action);
    if (!daily.allowed) {
      const msg = isRegen
        ? "Regeneration limit reached (3 max). Please use the current package."
        : "Session package limit reached for today. Try again tomorrow.";
      return { error: true, message: msg };
    }

    const cacheKey = buildSessionCacheKey(context, tutorNotes);
    if (!isRegen) {
      const cached = await getSessionPackageCache(cacheKey);
      if (cached) return cached;
    }

    const { systemPrompt, userContent } = buildStudioSessionPrompts(context, tutorNotes);
    const raw = await generateJson(systemPrompt, userContent, SESSION_PACKAGE_TIMEOUT_MS);

    if (containsPii(raw)) {
      return { error: true, message: "AI response contained unexpected content. Please try again." };
    }

    const jsonStr = stripMarkdownJson(raw);
    const parsed = parseStudioPackageFromModelText(jsonStr);
    if ("error" in parsed) {
      return { error: true, message: parsed.error };
    }

    setSessionPackageCache(cacheKey, parsed).catch(() => {});

    return parsed;
  } catch (err) {
    return handleAiError(err, "generateStudioSessionPackage", context.course.slice(0, 100));
  }
}

export async function* streamStudioSessionPackageText(
  context: SessionPackageRichContext,
  tutorNotes: string | undefined,
  userId: string
): AsyncGenerator<string> {
  void userId;

  if (isCircuitOpen()) {
    throw new Error(CIRCUIT_OPEN_ERROR);
  }

  const { systemPrompt, userContent } = buildStudioSessionPrompts(context, tutorNotes);
  const fullSystem = `${MENTRIXA_SYSTEM_GUARD}\n\n${systemPrompt}`;
  const client = getClient();

  try {
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
      const t =
        typeof (chunk as { text?: string }).text === "string"
          ? (chunk as { text: string }).text
          : "";
      if (t) {
        buffer += t;
        yield t;
      }
    }
    if (containsPii(buffer)) {
      throw new Error("AI response contained unexpected content.");
    }
    recordCircuitSuccess();
  } catch (err) {
    recordCircuitFailure();
    reportAiFailure("streamStudioSessionPackageText", err, context.course.slice(0, 100));
    throw err;
  }
}

export async function analyzeRecordingForStudioContext(
  input: { course: string; mimeType: string; base64Data: string },
  userId: string
): Promise<RecordingAnalysisResult | AiErrorResult> {
  return analyzeRecordingContext(input, userId);
}

export async function analyzeRecordingForStudioContextFromFile(
  input: { course: string; mimeType: string; fileUri: string },
  userId: string
): Promise<RecordingAnalysisResult | AiErrorResult> {
  return analyzeRecordingContext(input, userId);
}

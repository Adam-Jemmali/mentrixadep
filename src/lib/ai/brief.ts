/**
 * Brief AI — pre-session brief generation.
 */

import {
  type AiErrorResult,
  sanitizeForPrompt,
  containsPii,
  isCircuitOpen,
  CIRCUIT_OPEN_ERROR,
  enforceAiRateLimit,
  generateJson,
  parseModelJson,
  handleAiError,
  SESSION_PACKAGE_TIMEOUT_MS,
} from "./shared";

// ============================================
// TYPES
// ============================================

export interface PreSessionBriefInput {
  /** Course / subject name */
  course: string;
  /** Approximate session number (1 = first session in this course) */
  sessionNumber: number;
  /** Duration in minutes */
  durationMinutes: number;
  /** Recent weak areas: topic strings derived from failed quest attempts */
  weakAreas: string[];
  /** Recent completed quest topics (for continuity) */
  recentQuestTopics: string[];
  /** Optional: notes from prior sessions in this course */
  priorSessionSummaries: string[];
}

export interface PreSessionBrief {
  /** 2-3 bullet topics learner will likely cover */
  likelyCoverage: string[];
  /** Personalised weak spots based on quest error patterns */
  weakSpotsToWatch: string[];
  /** Single 2-min warm-up practice problem */
  warmUpExercise: {
    title: string;
    prompt: string;
    hint?: string;
  };
  /** 3 suggested questions to ask the Guide */
  questionsToAsk: string[];
}

// ============================================
// EXPORTED FUNCTIONS
// ============================================

export async function generatePreSessionBrief(
  input: PreSessionBriefInput,
  userId: string
): Promise<PreSessionBrief | AiErrorResult> {
  try {
    await enforceAiRateLimit(userId, "ai.presession");

    if (isCircuitOpen()) {
      return { error: true, message: CIRCUIT_OPEN_ERROR };
    }

    const course = sanitizeForPrompt(input.course).slice(0, 120);
    const weakAreas = input.weakAreas
      .slice(0, 6)
      .map((w) => sanitizeForPrompt(w).slice(0, 200));
    const recentTopics = input.recentQuestTopics
      .slice(0, 6)
      .map((t) => sanitizeForPrompt(t).slice(0, 200));
    const priorSummaries = input.priorSessionSummaries
      .slice(0, 3)
      .map((s) => sanitizeForPrompt(s).slice(0, 1000));

    const systemPrompt = `You are Mentrixa's AI learning coach generating a Pre-Session Brief for a learner about to have a live tutoring session. Be concrete, specific, and motivating — not generic.

Output JSON only with exactly these keys:
- likelyCoverage: string[] — exactly 2-3 bullet phrases describing what the session will probably cover, inferred from the course name, session number, and prior summaries. Be specific to the subject, not filler.
- weakSpotsToWatch: string[] — exactly 2-3 bullets naming specific concepts or skills the learner has struggled with based on quest performance. If no data, infer common stumbling blocks for this course and level.
- warmUpExercise: { "title": string, "prompt": string, "hint": string } — a single 2-minute practice problem directly relevant to the session's likely coverage. Hint is optional but encouraged.
- questionsToAsk: string[] — exactly 3 specific, high-value questions the learner should ask their Guide during the session to maximise depth and retention.

Rules:
- Every field must be tailored to the course "${course}", not a generic template.
- Questions must be ones a serious student would genuinely ask — not surface-level.
- Warm-up must be completable in under 2 minutes (no multi-part problems).
- Do not produce JSON with any placeholder text. All output must be substantive.`;

    const weakAreaBlock =
      weakAreas.length > 0
        ? `Recent weak areas from Quest mistakes:\n${weakAreas.map((w) => `- ${w}`).join("\n")}`
        : "No Quest mistake data available yet.";

    const recentTopicsBlock =
      recentTopics.length > 0
        ? `Recent Quest topics practiced:\n${recentTopics.map((t) => `- ${t}`).join("\n")}`
        : "";

    const priorBlock =
      priorSummaries.length > 0
        ? `Prior session summaries:\n${priorSummaries.map((s, i) => `Session ${i + 1}: ${s}`).join("\n\n")}`
        : "First session in this course.";

    const userContent = [
      `Course: ${course}`,
      `Session number: ${input.sessionNumber} (in this course)`,
      `Scheduled duration: ${input.durationMinutes} minutes`,
      "",
      weakAreaBlock,
      recentTopicsBlock,
      "",
      priorBlock,
    ]
      .filter(Boolean)
      .join("\n");

    const raw = await generateJson(systemPrompt, userContent, SESSION_PACKAGE_TIMEOUT_MS);

    if (containsPii(raw)) {
      return { error: true, message: "AI response contained unexpected content. Please try again." };
    }

    const parsed = parseModelJson<{
      likelyCoverage?: unknown;
      weakSpotsToWatch?: unknown;
      warmUpExercise?: unknown;
      questionsToAsk?: unknown;
    }>(raw);

    if (!parsed.ok) {
      return { error: true, message: "Failed to parse pre-session brief." };
    }

    const val = parsed.value;
    const likelyCoverage = Array.isArray(val.likelyCoverage)
      ? (val.likelyCoverage as unknown[]).filter((x) => typeof x === "string").map((x) => String(x)).slice(0, 3)
      : [];
    const weakSpotsToWatch = Array.isArray(val.weakSpotsToWatch)
      ? (val.weakSpotsToWatch as unknown[]).filter((x) => typeof x === "string").map((x) => String(x)).slice(0, 3)
      : [];
    const questionsToAsk = Array.isArray(val.questionsToAsk)
      ? (val.questionsToAsk as unknown[]).filter((x) => typeof x === "string").map((x) => String(x)).slice(0, 3)
      : [];

    const rawWarmUp =
      val.warmUpExercise && typeof val.warmUpExercise === "object"
        ? (val.warmUpExercise as Record<string, unknown>)
        : null;
    const warmUpExercise = {
      title: typeof rawWarmUp?.title === "string" ? rawWarmUp.title : "Quick warm-up",
      prompt: typeof rawWarmUp?.prompt === "string" ? rawWarmUp.prompt : "",
      hint: typeof rawWarmUp?.hint === "string" ? rawWarmUp.hint : undefined,
    };

    if (likelyCoverage.length === 0 || warmUpExercise.prompt.length < 4) {
      return { error: true, message: "AI returned incomplete brief data. Please try again." };
    }

    return { likelyCoverage, weakSpotsToWatch, warmUpExercise, questionsToAsk };
  } catch (err) {
    return handleAiError(err, "generatePreSessionBrief", input.course.slice(0, 100));
  }
}

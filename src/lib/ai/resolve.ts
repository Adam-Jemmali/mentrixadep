/**
 * Resolve AI — mistake review / "get unstuck" feature.
 */

import {
  type AiErrorResult,
  sanitizeForPrompt,
  containsPii,
  isCircuitOpen,
  recordCircuitFailure,
  CIRCUIT_OPEN_ERROR,
  MENTRIXA_SYSTEM_GUARD,
  enforceAiRateLimit,
  getClient,
  withBackoff,
  extractGeminiResponseText,
  handleAiError,
} from "./shared";

// ============================================
// EXPORTED FUNCTIONS
// ============================================

export async function generateMistakeReview(
  questionPrompt: string,
  referenceAnswer: string,
  userAnswer: string,
  userId: string
): Promise<string | AiErrorResult> {
  try {
    await enforceAiRateLimit(userId, "quest.ai.mistake");

    if (isCircuitOpen()) {
      return { error: true, message: CIRCUIT_OPEN_ERROR };
    }

    const systemPrompt = `Explain clearly why the student's answer missed the mark and how to get it right next time. 2-4 sentences. Plain text, no JSON.`;
    const userContent = `Question:\n${sanitizeForPrompt(questionPrompt).slice(0, 3000)}\n\nIdeal answer:\n${sanitizeForPrompt(referenceAnswer).slice(0, 2000)}\n\nStudent wrote:\n${sanitizeForPrompt(userAnswer).slice(0, 2000)}`;
    const fullSystem = `${MENTRIXA_SYSTEM_GUARD}\n\n${systemPrompt}`;
    const client = getClient();

    const res = await withBackoff(() =>
      client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userContent,
        config: { systemInstruction: fullSystem },
      })
    );

    const text = extractGeminiResponseText(res);
    if (!text.trim()) {
      return { error: true, message: "Empty explanation." };
    }

    const result = text.trim().slice(0, 1200);
    if (containsPii(result)) {
      return { error: true, message: "AI response contained unexpected content. Please try again." };
    }

    return result;
  } catch (err) {
    if (err instanceof Error) {
      recordCircuitFailure();
    }
    return handleAiError(err, "generateMistakeReview", questionPrompt.slice(0, 200));
  }
}

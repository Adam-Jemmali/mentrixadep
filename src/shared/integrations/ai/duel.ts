/**
 * Duel AI — skill duel (1v1 MCQ) question generation.
 */

import {
  type AiErrorResult,
  sanitizeForPrompt,
  containsPii,
  enforceAiRateLimit,
  peekDailyLimit,
  incrementDailyLimit,
  generateJsonRetryOnTimeout,
  stripMarkdownJson,
  handleAiError,
  subjectFidelityPromptBlock,
  isSubjectLockedText,
  SESSION_PACKAGE_TIMEOUT_MS,
} from "./shared";

// ============================================
// TYPES
// ============================================

export interface DuelQuestionPayload {
  prompt: string;
  choices: string[];
  correctIndex: number;
  type: "mcq" | "tf" | "flashcard";
}

// ============================================
// INTERNAL HELPERS
// ============================================

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

// ============================================
// EXPORTED FUNCTIONS
// ============================================

export async function generateDuelQuestions(
  divisionName: string,
  divisionKey: string,
  userId: string,
  count: number = 5
): Promise<{ questions: DuelQuestionPayload[] } | AiErrorResult> {
  try {
    await enforceAiRateLimit(userId, "duel.questions");

    const dailyPeek = await peekDailyLimit(userId, "duel_questions");
    if (!dailyPeek.allowed) {
      return { error: true, message: "Daily duel question limit reached (20/day). Come back tomorrow!" };
    }

    const n = Math.max(3, Math.min(10, count));
    const safeDivisionName = sanitizeForPrompt(divisionName).slice(0, 80);
    const safeDivisionKey = sanitizeForPrompt(divisionKey).slice(0, 40);

    const systemPrompt = `You write duel questions for tutoring (two learners compete on the same items). There are NO embedded images—everything must be readable from plain text. Return JSON only:
{ "questions": [ {
  "type": "mcq" | "tf" | "flashcard",
  "prompt": string,
  "choices": string[],
  "correctIndex": number
} ] }

Types:
- "mcq": standard multiple choice — exactly 4 distinct choices; correctIndex 0–3.
- "tf": exactly two choices, which must be the strings "True" and "False" only; correctIndex 0 or 1.
- "flashcard": prompt asks for a key term/definition check; choices are exactly 4 plausible definitions (one correct); correctIndex 0–3.

Challenge level:
- Target AP / honors / early undergrad rigor for "${safeDivisionName}". Wrong answers must be plausible partial-understanding traps—not jokes or unrelated fillers.

Prompt style:
- Use clean exam-style wording. Do not use template prefixes like "Scenario sketch" or "Diagram described".
- Keep each prompt specific to "${safeDivisionName}" (division key: ${safeDivisionKey}) with concrete domain content.
- No placeholder wording, no generic study-skill filler.
${subjectFidelityPromptBlock(safeDivisionName)}

Formatting:
- Use Unicode for powers where helpful (x², x³, θ). Do NOT use LaTeX or dollar signs.
- Exactly ${n} questions total about "${safeDivisionName}".
- Include a mix: at least one "tf", at least one "flashcard", remainder "mcq" when ${n} >= 3.
- Fair stems—reward careful reading and domain understanding.
- correctIndex is always 0-based index into the choices array for that question.`;

    const raw = await generateJsonRetryOnTimeout(
      systemPrompt,
      `Generate exactly ${n} questions with the required type mix.`,
      SESSION_PACKAGE_TIMEOUT_MS
    );

    if (containsPii(raw)) {
      return { error: true, message: "AI response contained unexpected content. Please try again." };
    }

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
      return { error: true, message: "Could not generate enough valid questions. Try again." };
    }
    const duelSubjectLocked = questions.every((q) =>
      isSubjectLockedText(
        safeDivisionName,
        [q.prompt, ...q.choices].join(" ")
      )
    );
    if (!duelSubjectLocked) {
      return { error: true, message: "Generated duel pack did not stay within the selected subject." };
    }
    await incrementDailyLimit(userId, "duel_questions");
    return { questions };
  } catch (err) {
    return handleAiError(err, "generateDuelQuestions", divisionName.slice(0, 80));
  }
}

import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "@/lib/env";
import { sanitizeString } from "@/lib/security";

export type ResolveAiInput = {
  subject: string;
  difficulty: "no_idea" | "concept_but_stuck" | "minor_confusion";
  problemText: string;
  imageBase64?: string | null;
  imageMimeType?: string | null;
};

export type ResolveAiOutput = {
  assignmentLikely: boolean;
  assignmentReason: string | null;
  summary: string;
  approach: string[];
  explanationSteps: string[];
  checks: string[];
  finalAnswer: string | null;
  disclaimer: string | null;
};

function getLevelTone(difficulty: ResolveAiInput["difficulty"]): string {
  if (difficulty === "no_idea") {
    return "Explain from first principles with minimal assumptions and define terms before using them.";
  }
  if (difficulty === "concept_but_stuck") {
    return "Assume the student understands core concepts. Focus on the exact gap and unblocking strategy.";
  }
  return "Keep it concise and targeted. Focus on one or two likely mistakes and quick correction.";
}

function extractJson(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function solveResolveProblemWithGemini(input: ResolveAiInput): Promise<ResolveAiOutput> {
  const client = new GoogleGenAI({ apiKey: getGeminiApiKey() });

  const cleanProblem = sanitizeString(input.problemText).slice(0, 8000);
  const cleanSubject = sanitizeString(input.subject).slice(0, 120);
  const tone = getLevelTone(input.difficulty);

  const userPrompt = [
    `Subject: ${cleanSubject}`,
    `Difficulty self-assessment: ${input.difficulty}`,
    "",
    "Problem from student:",
    cleanProblem,
  ].join("\n");

  const systemInstruction = [
    "You are Mentrixa Resolve, an educational AI tutor.",
    "Be supportive, clear, and pedagogical.",
    "Never provide content that helps academic dishonesty.",
    "If this appears to be a full assignment or take-home exam, provide guidance and approach, not full substitution work.",
    tone,
    "Return strict JSON only with fields:",
    "{",
    '  "assignmentLikely": boolean,',
    '  "assignmentReason": string,',
    '  "summary": string,',
    '  "approach": string[],',
    '  "explanationSteps": string[],',
    '  "checks": string[],',
    '  "finalAnswer": string | null,',
    '  "disclaimer": string | null',
    "}",
  ].join("\n");

  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [{ text: userPrompt }];

  if (input.imageBase64 && input.imageMimeType) {
    parts.push({
      inlineData: {
        mimeType: input.imageMimeType,
        data: input.imageBase64,
      },
    });
  }

  const res = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  const rawText = typeof res.text === "string" ? res.text : "";
  const parsed = JSON.parse(extractJson(rawText)) as Partial<ResolveAiOutput>;

  const assignmentLikely = parsed.assignmentLikely === true;
  const assignmentReason =
    typeof parsed.assignmentReason === "string" && parsed.assignmentReason.trim()
      ? parsed.assignmentReason.trim().slice(0, 800)
      : null;

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 2000)
      : "Here is a structured way to approach this problem.";

  const approach = Array.isArray(parsed.approach)
    ? parsed.approach.filter((x): x is string => typeof x === "string").slice(0, 8)
    : [];
  const explanationSteps = Array.isArray(parsed.explanationSteps)
    ? parsed.explanationSteps.filter((x): x is string => typeof x === "string").slice(0, 12)
    : [];
  const checks = Array.isArray(parsed.checks)
    ? parsed.checks.filter((x): x is string => typeof x === "string").slice(0, 8)
    : [];
  const finalAnswer =
    typeof parsed.finalAnswer === "string" && parsed.finalAnswer.trim()
      ? parsed.finalAnswer.trim().slice(0, 2000)
      : null;

  let disclaimer: string | null =
    typeof parsed.disclaimer === "string" && parsed.disclaimer.trim()
      ? parsed.disclaimer.trim().slice(0, 1000)
      : null;

  if (assignmentLikely && !disclaimer) {
    disclaimer =
      "This looks like graded assignment-style work. I can guide your reasoning and check your approach, but I won’t complete the full assignment for you.";
  }

  return {
    assignmentLikely,
    assignmentReason,
    summary,
    approach,
    explanationSteps,
    checks,
    finalAnswer,
    disclaimer,
  };
}

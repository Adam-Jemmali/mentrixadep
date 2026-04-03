import { z } from "zod";

/** AI JSON for Mentrixa Studio (post-session package). */
export const studioPackageJsonSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  flashcards: z.array(z.object({ q: z.string(), a: z.string() })),
  practiceExercises: z.array(
    z.object({
      title: z.string(),
      prompt: z.string(),
      hint: z.string().optional(),
    }),
  ),
  followUpTopics: z.array(z.string()),
  followupQuestPrompts: z.array(z.string()),
});

export type StudioPackageJson = z.infer<typeof studioPackageJsonSchema>;

export interface NormalizedStudioPackage {
  summary: string;
  keyPoints: string[];
  flashcards: { q: string; a: string }[];
  practiceExercises: { title: string; prompt: string; hint?: string }[];
  followUpTopics: string[];
  followupQuestPrompts: string[];
}

/** Enforce exact counts expected by product (5 / 3 / 3 / 3). */
export function normalizeStudioPackageJson(parsed: StudioPackageJson): NormalizedStudioPackage {
  const summary = parsed.summary.trim();
  const keyPoints = parsed.keyPoints.map((s) => s.trim()).filter(Boolean).slice(0, 8);
  const flashcards = parsed.flashcards
    .filter((f) => f.q.trim() && f.a.trim())
    .slice(0, 5)
    .map((f) => ({ q: f.q.trim(), a: f.a.trim() }));
  const practiceExercises = parsed.practiceExercises
    .filter((e) => e.title.trim() && e.prompt.trim())
    .slice(0, 3)
    .map((e) => ({
      title: e.title.trim(),
      prompt: e.prompt.trim(),
      hint: e.hint?.trim() || undefined,
    }));
  const followUpTopics = parsed.followUpTopics.map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const followupQuestPrompts = parsed.followupQuestPrompts.map((s) => s.trim()).filter(Boolean).slice(0, 3);

  return {
    summary,
    keyPoints,
    flashcards,
    practiceExercises,
    followUpTopics,
    followupQuestPrompts,
  };
}

export function parseStudioPackageFromModelText(raw: string): NormalizedStudioPackage | { error: string } {
  const stripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let obj: unknown;
  try {
    obj = JSON.parse(stripped);
  } catch {
    return { error: "Could not parse Studio output as JSON." };
  }
  const parsed = studioPackageJsonSchema.safeParse(obj);
  if (!parsed.success) {
    return { error: "Studio output did not match the expected format." };
  }
  return normalizeStudioPackageJson(parsed.data);
}

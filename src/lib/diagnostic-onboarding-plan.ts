import { z } from "zod";

export const diagnosticInputSchema = z.object({
  subject: z.string().min(1).max(200),
  goal: z.enum(["exam", "interview", "assignment", "general"]),
  timeline: z.enum(["this_week", "this_month", "this_semester", "no_deadline"]),
  selfRating: z.number().int().min(1).max(5),
  weakAreas: z.string().max(500).optional(),
  hoursPerWeek: z.number().int().min(1).max(40),
  preferredStyle: z.enum(["visual", "practice", "reading", "mixed"]),
  priorTutoringExperience: z.boolean(),
});

export const diagnosticResultSchema = z.object({
  summary: z.string().min(1),
  studyPlan: z
    .array(
      z.object({
        topic: z.string().min(1),
        priority: z.enum(["high", "medium", "low"]),
        estimatedHours: z.number().positive(),
        suggestedApproach: z.string().min(1),
      })
    )
    .min(1),
  firstPracticePrompt: z.string().min(1),
  recommendedSessionsPerWeek: z.number().int().min(0).max(14),
  estimatedWeeksToGoal: z.number().int().min(1).max(52),
});

export type DiagnosticInput = z.infer<typeof diagnosticInputSchema>;

export interface StudyPlanTopic {
  topic: string;
  priority: "high" | "medium" | "low";
  estimatedHours: number;
  suggestedApproach: string;
}

export interface DiagnosticResult {
  summary: string;
  studyPlan: StudyPlanTopic[];
  firstPracticePrompt: string;
  recommendedSessionsPerWeek: number;
  estimatedWeeksToGoal: number;
}

export type DiagnosticOnboardingResult =
  | { success: true; result: DiagnosticResult; fromFallback?: boolean }
  | { success: false; error: string };

const GOAL_LABELS: Record<DiagnosticInput["goal"], string> = {
  exam: "exam preparation",
  interview: "interview preparation",
  assignment: "assignment completion",
  general: "steady improvement",
};

const STYLE_APPROACH: Record<DiagnosticInput["preferredStyle"], string> = {
  visual: "Use diagrams, videos, and worked examples.",
  practice: "Drill with practice problems and instant feedback.",
  reading: "Read concise notes and summarize key ideas.",
  mixed: "Alternate reading, examples, and short practice sets.",
};

function estimatedWeeksForTimeline(timeline: DiagnosticInput["timeline"]): number {
  switch (timeline) {
    case "this_week":
      return 1;
    case "this_month":
      return 4;
    case "this_semester":
      return 12;
    default:
      return 8;
  }
}

/** Rule-based plan when Gemini is unavailable — still personalized from quiz answers. */
export function buildFallbackDiagnosticResult(data: DiagnosticInput): DiagnosticResult {
  const focus = data.weakAreas?.trim() || `core ${data.subject} fundamentals`;
  const weeks = estimatedWeeksForTimeline(data.timeline);
  const sessionsPerWeek = Math.min(3, Math.max(1, Math.round(data.hoursPerWeek / 2)));
  const skillGap = 5 - data.selfRating;

  const studyPlan: StudyPlanTopic[] = [
    {
      topic: `${data.subject}: diagnostic baseline`,
      priority: "high",
      estimatedHours: Math.max(1, Math.round(data.hoursPerWeek * 0.25)),
      suggestedApproach: `Quick self-check on prerequisites. ${STYLE_APPROACH[data.preferredStyle]}`,
    },
    {
      topic: focus,
      priority: "high",
      estimatedHours: Math.max(2, Math.round(data.hoursPerWeek * 0.4)),
      suggestedApproach: `Target your stated weak area with focused practice. ${STYLE_APPROACH[data.preferredStyle]}`,
    },
    {
      topic: `${GOAL_LABELS[data.goal]} sprint`,
      priority: skillGap >= 2 ? "high" : "medium",
      estimatedHours: Math.max(1, Math.round(data.hoursPerWeek * 0.2)),
      suggestedApproach: data.priorTutoringExperience
        ? "Book a Guide session for live help on stuck problems."
        : "Try a live Guide session when you need expert walkthroughs.",
    },
    {
      topic: "Weekly review & retention",
      priority: "medium",
      estimatedHours: Math.max(1, Math.round(data.hoursPerWeek * 0.15)),
      suggestedApproach: "Run Quest practice and revisit mistakes from the week.",
    },
  ];

  return {
    summary: `You're working on ${data.subject} for ${GOAL_LABELS[data.goal]} (${data.timeline.replace(/_/g, " ")}). This starter plan uses your quiz answers; AI was busy, so refine topics anytime from Quest or a Guide session.`,
    studyPlan,
    firstPracticePrompt: `In ${data.subject}, help me understand and practice: ${focus}. Give one clear explanation, one worked example, and one practice problem with hints.`,
    recommendedSessionsPerWeek: sessionsPerWeek,
    estimatedWeeksToGoal: weeks,
  };
}

export function buildDiagnosticPrompt(data: DiagnosticInput): string {
  return `A student completed a diagnostic onboarding quiz. Generate a personalized study plan.

Student profile:
- Subject: ${data.subject}
- Goal: ${data.goal}
- Timeline: ${data.timeline.replace(/_/g, " ")}
- Self-rated skill (1-5): ${data.selfRating}
- Weak areas: ${data.weakAreas || "not specified"}
- Available hours/week: ${data.hoursPerWeek}
- Preferred learning style: ${data.preferredStyle}
- Prior tutoring experience: ${data.priorTutoringExperience ? "yes" : "no"}

Return a JSON object with these exact fields:
{
  "summary": "2-3 sentence personalized assessment",
  "studyPlan": [
    {
      "topic": "topic name",
      "priority": "high" | "medium" | "low",
      "estimatedHours": number,
      "suggestedApproach": "brief approach description"
    }
  ],
  "firstPracticePrompt": "A ready-to-use quest prompt the student can immediately submit to start practicing",
  "recommendedSessionsPerWeek": number,
  "estimatedWeeksToGoal": number
}

Generate 4-8 topics. The firstPracticePrompt should be specific to their weakest area and ready to paste into the Quest system.`;
}

export function formatDiagnosticPersistError(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { code?: string; message?: string; details?: string };
    if (e.code === "42P01") {
      return "Study plan storage is not set up yet. Ask an admin to run supabase/088-diagnostic-onboarding.sql.";
    }
    if (e.code === "23503") {
      return "Your account profile is still syncing. Refresh the page and try again in a moment.";
    }
    if (e.message) return e.message;
  }
  return "Could not save your study plan. Please try again.";
}

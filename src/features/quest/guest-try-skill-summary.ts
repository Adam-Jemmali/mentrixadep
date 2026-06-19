import {
  type GuestTryQuestion,
  type GuestTryQuestionKind,
  stripGuestTryPromptDecorators,
} from "@/features/quest/guest-try-types";

export type GuestTrySkillSignal = "strong" | "developing" | "focus";

export type GuestTrySkillLine = {
  label: string;
  correct: number;
  total: number;
  signal: GuestTrySkillSignal;
};

export type GuestTrySkillSummary = {
  headline: string;
  skillNote: string;
  lines: GuestTrySkillLine[];
  mistakeReviews: { questionId: string; prompt: string; review: string }[];
};

const KIND_BUCKETS: { label: string; kinds: GuestTryQuestionKind[] }[] = [
  { label: "Multi step problem solving", kinds: ["problem_solving"] },
  { label: "Written precision", kinds: ["short_answer"] },
  { label: "Analytical selection", kinds: ["mcq", "image_mcq", "true_false"] },
  { label: "Process sequencing", kinds: ["drag_rank"] },
];

function signalFor(correct: number, total: number): GuestTrySkillSignal {
  if (total === 0) return "developing";
  const pct = correct / total;
  if (pct >= 0.75) return "strong";
  if (pct >= 0.4) return "developing";
  return "focus";
}

function signalLabel(signal: GuestTrySkillSignal): string {
  switch (signal) {
    case "strong":
      return "Strong";
    case "developing":
      return "Developing";
    case "focus":
      return "Needs focus";
  }
}

/** Skill breakdown from a completed guest try run. */
export function buildGuestTrySkillSummary(
  questions: GuestTryQuestion[],
  results: boolean[],
  subject: string,
): GuestTrySkillSummary {
  const lines: GuestTrySkillLine[] = [];

  for (const bucket of KIND_BUCKETS) {
    let correct = 0;
    let total = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      if (!bucket.kinds.includes(q.kind)) continue;
      total += 1;
      if (results[i]) correct += 1;
    }
    if (total === 0) continue;
    lines.push({
      label: bucket.label,
      correct,
      total,
      signal: signalFor(correct, total),
    });
  }

  const overallCorrect = results.filter(Boolean).length;
  const overallTotal = questions.length;
  const overallPct = overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : 0;

  const psLine = lines.find((l) => l.label.includes("problem solving"));
  const psStrong = psLine ? psLine.signal === "strong" : overallPct >= 70;

  const headline =
    overallPct >= 85
      ? `Strong ${subject} performance across this pack`
      : overallPct >= 60
        ? `Solid ${subject} foundation. Keep sharpening edge cases`
        : `Baseline ${subject} signal captured. Targeted practice recommended`;

  const skillNote = psStrong
    ? "You showed multi step reasoning and accuracy. This is the same Quest format students use on their profiles."
    : "This run mirrors what students prove in Quest. Written problem solving is weighted highest in your skill breakdown.";

  const mistakeReviews = questions
    .map((q, i) => ({ q, ok: results[i] ?? false }))
    .filter(({ ok }) => !ok)
    .map(({ q }) => ({
      questionId: q.id,
      prompt: stripGuestTryPromptDecorators(q.prompt, { preserveMath: true }),
      review: q.explanation,
    }));

  return {
    headline,
    skillNote,
    lines: lines.map((l) => ({ ...l, signal: l.signal })),
    mistakeReviews,
  };
}

/** Single problem-solver preview run for guest /try. */
export function buildGuestClassicSolverSummary(
  prompt: string,
  correct: boolean,
  review: string,
): GuestTrySkillSummary {
  return {
    headline: correct ? "Solid problem solving" : "Keep sharpening this skill",
    skillNote: correct
      ? "You worked through a full problem solver challenge in preview mode."
      : "Review the breakdown below, then sign up to save progress and run unlimited quests.",
    lines: [
      {
        label: "Problem solver",
        correct: correct ? 1 : 0,
        total: 1,
        signal: correct ? "strong" : "focus",
      },
    ],
    mistakeReviews: correct
      ? []
      : [
          {
            questionId: "classic-preview",
            prompt: stripGuestTryPromptDecorators(prompt, { preserveMath: true }),
            review,
          },
        ],
  };
}

export { signalLabel };

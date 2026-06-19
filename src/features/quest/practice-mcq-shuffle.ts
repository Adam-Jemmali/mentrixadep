import type { PracticeQuestion, PracticeQuestionMcq } from "@/features/quest/practice-quest-types";

/** Fisher–Yates shuffle for MCQ options; updates correctIndex to match. */
export function shuffleMcqQuestionOptions(
  mcq: PracticeQuestionMcq,
  random: () => number = Math.random,
): PracticeQuestionMcq {
  const n = mcq.options.length;
  if (n <= 1) return mcq;

  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }

  const correctAnswer = mcq.options[mcq.correctIndex];
  const options = order.map((i) => mcq.options[i]!);
  const correctIndex = options.findIndex((opt) => opt === correctAnswer);
  if (correctIndex < 0) return mcq;

  return { ...mcq, options, correctIndex };
}

export function shufflePracticePackMcqOptions(questions: PracticeQuestion[]): PracticeQuestion[] {
  return questions.map((q) => (q.kind === "mcq" ? shuffleMcqQuestionOptions(q) : q));
}

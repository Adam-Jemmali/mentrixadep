import type { GuestTryQuestion } from "@/features/quest/guest-try-types";

function shuffleIndices(length: number, random: () => number = Math.random): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

/** Shuffle MCQ / true-false / image MCQ options and keep correctIndex in sync. */
export function shuffleGuestTryQuestion(
  question: GuestTryQuestion,
  random: () => number = Math.random,
): GuestTryQuestion {
  if (
    question.kind !== "mcq" &&
    question.kind !== "true_false" &&
    question.kind !== "image_mcq"
  ) {
    return question;
  }

  const options = question.options;
  const correctIndex = question.correctIndex;
  if (!options || options.length <= 1 || correctIndex === undefined) return question;

  const order = shuffleIndices(options.length, random);
  const shuffledOptions = order.map((i) => options[i]!);
  const shuffledCorrectIndex = order.indexOf(correctIndex);
  if (shuffledCorrectIndex < 0) return question;

  const next: GuestTryQuestion = {
    ...question,
    options: shuffledOptions,
    correctIndex: shuffledCorrectIndex,
  };

  if (question.kind === "image_mcq") {
    if (question.optionImageUrls?.length === options.length) {
      next.optionImageUrls = order.map((i) => question.optionImageUrls![i]!);
    }
    if (question.optionImagePrompts?.length === options.length) {
      next.optionImagePrompts = order.map((i) => question.optionImagePrompts![i]!);
    }
  }

  return next;
}

export function shuffleGuestTryPack(
  questions: GuestTryQuestion[],
  random: () => number = Math.random,
): GuestTryQuestion[] {
  return questions.map((q) => shuffleGuestTryQuestion(q, random));
}

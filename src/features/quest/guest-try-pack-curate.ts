import { GUEST_TRY_MIN_PROBLEM_SOLVING, GUEST_TRY_QUEST_COUNT } from "@/features/quest/guest-try-constants";
import { buildGuestProblemSolvingSupplement } from "@/features/quest/guest-try-problem-solving-fallback";
import type { GuestTryQuestion, GuestTryQuestionKind } from "@/features/quest/guest-try-types";

/** Student Practice Pack–style mix: written work first, minimal true/false. */
const STUDENT_SLOT_ORDER: GuestTryQuestionKind[] = [
  "problem_solving",
  "problem_solving",
  "short_answer",
  "image_mcq",
  "mcq",
  "problem_solving",
  "drag_rank",
  "mcq",
  "short_answer",
  "problem_solving",
];

function dedupeById(questions: GuestTryQuestion[]): GuestTryQuestion[] {
  const seen = new Set<string>();
  return questions.filter((q) => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
}

/** Reorder and pad guest try packs so they mirror logged-in Practice Pack depth. */
export function curateGuestTryStudentPack(
  input: GuestTryQuestion[],
  subject: string,
  targetCount = GUEST_TRY_QUEST_COUNT,
): GuestTryQuestion[] {
  let pool = dedupeById(input);

  const psCount = pool.filter((q) => q.kind === "problem_solving").length;
  if (psCount < GUEST_TRY_MIN_PROBLEM_SOLVING) {
    pool = [
      ...pool,
      ...buildGuestProblemSolvingSupplement(subject).slice(0, GUEST_TRY_MIN_PROBLEM_SOLVING - psCount),
    ];
  }

  const tfIndexes = pool
    .map((q, i) => (q.kind === "true_false" ? i : -1))
    .filter((i) => i >= 0);
  for (let i = tfIndexes.length - 1; i >= 1; i -= 1) {
    pool.splice(tfIndexes[i]!, 1);
  }

  const picked: GuestTryQuestion[] = [];
  const usedIds = new Set<string>();

  for (const wantKind of STUDENT_SLOT_ORDER) {
    if (picked.length >= targetCount) break;
    const match = pool.find((q) => q.kind === wantKind && !usedIds.has(q.id));
    if (match) {
      picked.push(match);
      usedIds.add(match.id);
    }
  }

  for (const q of pool) {
    if (picked.length >= targetCount) break;
    if (!usedIds.has(q.id)) {
      picked.push(q);
      usedIds.add(q.id);
    }
  }

  while (picked.length < targetCount) {
    const donor = picked.find((q) => q.kind === "mcq") ?? picked[0] ?? pool[0];
    if (!donor) break;
    picked.push({ ...donor, id: `${donor.id}-pad-${picked.length}` });
  }

  return picked.slice(0, targetCount);
}

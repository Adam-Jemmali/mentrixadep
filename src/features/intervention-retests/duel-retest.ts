import type { SkillDuelQuestion } from "@/shared/types/database";

export type DuelQuestionWithNode = SkillDuelQuestion & {
  skillNodeId?: string;
};

/** Unique skill nodes the loser answered incorrectly (72h retest each). */
export function resolveMissedSkillNodeIds(
  questions: DuelQuestionWithNode[],
  answers: number[] | null,
): string[] {
  if (!answers || answers.length !== questions.length) return [];

  const missed: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < questions.length; i += 1) {
    const question = questions[i];
    const answer = answers[i];
    if (!question || typeof answer !== "number" || answer < 0) continue;
    if (answer === question.correctIndex) continue;

    const skillNodeId = question.skillNodeId?.trim();
    if (!skillNodeId || seen.has(skillNodeId)) continue;
    seen.add(skillNodeId);
    missed.push(skillNodeId);
  }

  return missed;
}

export function resolveFirstMissedSkillNodeId(
  questions: DuelQuestionWithNode[],
  answers: number[] | null,
): string | null {
  return resolveMissedSkillNodeIds(questions, answers)[0] ?? null;
}

import type { SkillDuelQuestion } from "@/shared/types/database";

export type DuelQuestionWithNode = SkillDuelQuestion & {
  skillNodeId?: string;
};

export function resolveFirstMissedSkillNodeId(
  questions: DuelQuestionWithNode[],
  answers: number[] | null,
): string | null {
  if (!answers || answers.length !== questions.length) return null;

  for (let i = 0; i < questions.length; i += 1) {
    const question = questions[i];
    const answer = answers[i];
    if (!question || typeof answer !== "number" || answer < 0) continue;
    if (answer === question.correctIndex) continue;

    const skillNodeId = question.skillNodeId?.trim();
    if (skillNodeId) return skillNodeId;
  }

  return null;
}

import type { PracticeQuestion } from "@/features/quest/practice-quest-types";

export function collectPracticeSkillNodeIds(
  questions: PracticeQuestion[],
): string[] {
  const nodeIds: string[] = [];

  for (const question of questions) {
    if ("skillNodeId" in question && question.skillNodeId) {
      nodeIds.push(question.skillNodeId);
    }
    if (question.kind === "multi_part") {
      for (const part of question.parts) {
        if (part.skillNodeId) nodeIds.push(part.skillNodeId);
      }
    }
  }

  return [...new Set(nodeIds)];
}

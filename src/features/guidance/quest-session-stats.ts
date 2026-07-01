import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { NodeSessionStat } from "@/features/guidance/verdict-engine-pure";
import type { PracticeQuestion } from "@/features/quest/practice-quest-types";

type AnswerLookup = Map<number, boolean> | Map<number, { correct: boolean }>;

function isCorrectAtIndex(lookup: AnswerLookup, index: number): boolean {
  const value = lookup.get(index);
  if (typeof value === "boolean") return value;
  return value?.correct ?? false;
}

export async function buildQuestSessionStatsFromPack(
  questions: PracticeQuestion[],
  answersByIndex: AnswerLookup,
): Promise<NodeSessionStat[]> {
  const byNode = new Map<
    string,
    { sessionCorrect: number; sessionTotal: number; subtopic?: string }
  >();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q) continue;
    const skillNodeId = (q as { skillNodeId?: string }).skillNodeId;
    if (!skillNodeId) continue;

    const row = byNode.get(skillNodeId) ?? {
      sessionCorrect: 0,
      sessionTotal: 0,
      subtopic: (q as { subtopicTag?: string }).subtopicTag,
    };
    row.sessionTotal += 1;
    if (isCorrectAtIndex(answersByIndex, i)) row.sessionCorrect += 1;
    byNode.set(skillNodeId, row);
  }

  const nodeIds = [...byNode.keys()];
  if (nodeIds.length === 0) return [];

  const admin = createAdminClient();
  const { data: nodes } = await admin
    .from("skill_nodes")
    .select("id, node_name")
    .in("id", nodeIds);

  const nameById = new Map((nodes ?? []).map((row) => [String(row.id), String(row.node_name)]));

  return nodeIds.map((skillNodeId) => {
    const stat = byNode.get(skillNodeId)!;
    return {
      skillNodeId,
      nodeName: nameById.get(skillNodeId) ?? stat.subtopic ?? "Skill node",
      sessionCorrect: stat.sessionCorrect,
      sessionTotal: stat.sessionTotal,
      misconceptionTag: null,
    };
  });
}

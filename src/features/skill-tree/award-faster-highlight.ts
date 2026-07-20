import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { QuestFasterHighlight } from "@/features/mastery-grid/types";
import { detectFasterForPackNodes } from "@/features/skill-tree/record-answer-latency";
import { skillTreeLabel } from "@/features/skill-tree/skill-tree-copy-pure";

export async function pickFasterHighlight(input: {
  userId: string;
  recentByNode: Map<string, number[]>;
  nodeNameById: Map<string, string>;
}): Promise<QuestFasterHighlight | null> {
  const hit = await detectFasterForPackNodes({
    userId: input.userId,
    recentByNode: input.recentByNode,
  });
  if (!hit) return null;

  const label = skillTreeLabel("faster");
  return {
    kind: "faster",
    nodeId: hit.nodeId,
    nodeName: input.nodeNameById.get(hit.nodeId) ?? "Skill",
    icon: label.icon,
    text: "Faster",
  };
}

export async function loadItemDifficultyRating(
  itemId: string,
): Promise<number | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("item_bank")
    .select("difficulty_rating")
    .eq("id", itemId)
    .maybeSingle();
  if (data?.difficulty_rating == null) return null;
  const n = Number(data.difficulty_rating);
  return Number.isFinite(n) ? n : null;
}

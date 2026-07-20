import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { applyXpAward } from "@/features/xp/xp-awards";
import { XP } from "@/features/xp/xp-constants";
import type { MasteryGridData, MasteryPackNodeSnapshot, QuestPhoenixHighlight } from "@/features/mastery-grid/types";
import { detectPhoenixRecovery, phoenixAwardKey } from "@/features/skill-tree/skill-phoenix-pure";
import { clearPhoenixSlump, loadPendingPhoenixSlumpNodeIds } from "@/features/skill-tree/skill-phoenix-slump";
import { isSolidState } from "@/features/skill-tree/skill-tree-unlock-pure";

export async function awardPhoenixRecoveries(input: {
  userId: string;
  masteryBefore: Record<string, MasteryPackNodeSnapshot> | undefined;
  masteryAfter: MasteryGridData;
  packNodeIds: string[];
  recoveryAt?: Date;
}): Promise<QuestPhoenixHighlight | null> {
  if (!input.masteryBefore || input.packNodeIds.length === 0) return null;

  const pending = await loadPendingPhoenixSlumpNodeIds(input.userId);
  if (pending.size === 0) return null;

  const afterById = new Map(
    input.masteryAfter.units.flatMap((unit) =>
      unit.nodes.map((node) => [node.id, node] as const),
    ),
  );
  const recoveryAt = input.recoveryAt ?? new Date();
  const admin = createAdminClient();
  const { data: nodeRows } = await admin
    .from("skill_nodes")
    .select("id, node_name")
    .in("id", [...new Set(input.packNodeIds)]);

  const nodeNameById = new Map(
    (nodeRows ?? []).map((row) => [String(row.id), String(row.node_name)]),
  );

  let highlight: QuestPhoenixHighlight | null = null;

  for (const nodeId of input.packNodeIds) {
    if (!pending.has(nodeId)) continue;
    const before = input.masteryBefore[nodeId];
    const after = afterById.get(nodeId);
    if (!before || !after) continue;

    const recovered = detectPhoenixRecovery({
      priorState: before.state,
      nextState: after.state,
      slumpPending: true,
    });
    if (!recovered || !isSolidState(after.state)) continue;

    const awardKey = phoenixAwardKey(input.userId, nodeId, recoveryAt);
    const xp = await applyXpAward(input.userId, XP.PHOENIX_RECOVERY, awardKey, null);
    if (!xp.awarded && xp.skipped) {
      await clearPhoenixSlump(input.userId, nodeId);
      continue;
    }

    await clearPhoenixSlump(input.userId, nodeId);
    highlight = {
      kind: "recovered",
      nodeId,
      nodeName: nodeNameById.get(nodeId) ?? after.nodeName,
      icon: "xp",
      text: "Recovered",
      xpAwarded: XP.PHOENIX_RECOVERY,
    };
  }

  return highlight;
}

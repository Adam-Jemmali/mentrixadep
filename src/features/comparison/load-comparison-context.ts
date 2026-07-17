/**
 * Peer comparison context — snapshot read only (never a live VFA join).
 * Internal server-only; used by the Verdict Engine as the optional fourth field.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { ComparisonActorKind } from "@/features/comparison/comparison-context-pure";

/**
 * P#022: one sentence from node_percentile_snapshot / guide_impact_percentile_snapshot,
 * or null when sample size is below 10.
 */
export async function getComparisonContext(
  userId: string,
  skillNodeId: string,
  actorKind: ComparisonActorKind = "student",
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_comparison_context", {
    p_actor_id: userId,
    p_skill_node_id: skillNodeId,
    p_actor_kind: actorKind,
  });

  if (error) {
    console.error("[getComparisonContext]", error.message);
    return null;
  }

  if (typeof data !== "string" || !data.trim()) return null;
  return data.trim();
}

/** @deprecated Prefer getComparisonContext — same snapshot RPC. */
export async function loadComparisonContext(
  actorId: string,
  skillNodeId: string,
  actorKind: ComparisonActorKind,
): Promise<string | null> {
  return getComparisonContext(actorId, skillNodeId, actorKind);
}

/**
 * Peer comparison context loader — internal server-only (verdict engine).
 * Not a server action module; import from trusted server code only.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { ComparisonActorKind } from "@/features/comparison/comparison-context-pure";

export async function loadComparisonContext(
  actorId: string,
  skillNodeId: string,
  actorKind: ComparisonActorKind,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_comparison_context", {
    p_actor_id: actorId,
    p_skill_node_id: skillNodeId,
    p_actor_kind: actorKind,
  });

  if (error) {
    console.error("[loadComparisonContext]", error.message);
    return null;
  }

  if (typeof data !== "string" || !data.trim()) return null;
  return data.trim();
}

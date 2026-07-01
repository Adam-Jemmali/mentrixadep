import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { matchSkillNodeForConcept } from "@/features/breakthrough-events/resolve-skill-node-pure";

export type { SkillNodeLookupRow } from "@/features/breakthrough-events/resolve-skill-node-pure";
export { matchSkillNodeForConcept } from "@/features/breakthrough-events/resolve-skill-node-pure";

export async function resolveApCalcAbSkillNodeForConcept(
  admin: ReturnType<typeof createAdminClient>,
  concept: string,
): Promise<{ id: string; node_name: string } | null> {
  const { data: nodes } = await admin
    .from("skill_nodes")
    .select("id, node_name, node_slug")
    .eq("subject", AP_CALC_AB_SUBJECT);

  const match = matchSkillNodeForConcept(nodes ?? [], concept);
  return match ? { id: String(match.id), node_name: String(match.node_name) } : null;
}

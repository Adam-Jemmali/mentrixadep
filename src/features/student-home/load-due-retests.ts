import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { isInterventionRetestDue } from "@/features/intervention-retests/schedule-intervention-retests-pure";

export type DueRetestNode = {
  id: string;
  skillNodeId: string;
  nodeName: string;
  scheduledFor: string;
};

export async function loadDueRetestNodes(userId: string): Promise<DueRetestNode[]> {
  const admin = createAdminClient();
  const nowMs = Date.now();
  const { data: rows } = await admin
    .from("intervention_retests")
    .select(
      "id, skill_node_id, scheduled_for, skill_nodes!intervention_retests_skill_node_id_fkey(node_name)",
    )
    .eq("user_id", userId)
    .is("completed_at", null)
    .order("scheduled_for", { ascending: true })
    .limit(12);

  const due: DueRetestNode[] = [];
  for (const row of rows ?? []) {
    if (!isInterventionRetestDue(String(row.scheduled_for), nowMs)) continue;
    const skillNodes = row.skill_nodes as { node_name: string } | { node_name: string }[] | null;
    const nodeName = Array.isArray(skillNodes)
      ? skillNodes[0]?.node_name
      : skillNodes?.node_name;
    due.push({
      id: String(row.id),
      skillNodeId: String(row.skill_node_id),
      nodeName: nodeName ?? "Skill node",
      scheduledFor: String(row.scheduled_for),
    });
  }

  return due;
}

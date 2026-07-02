import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  isInterventionRetestDue,
} from "@/features/intervention-retests/schedule-intervention-retests-pure";
import type { PendingRetestHubState } from "@/features/intervention-retests/retest-hub-pure";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";

type RetestRow = {
  skill_node_id: string;
  scheduled_for: string;
  skill_nodes: { node_name: string } | { node_name: string }[] | null;
};

export async function loadNextPendingRetest(
  userId: string,
): Promise<PendingRetestHubState | null> {
  const admin = createAdminClient();
  const [entitlements, { data: rows }] = await Promise.all([
    getStudentEntitlements(userId),
    admin
      .from("intervention_retests")
      .select(
        "skill_node_id, scheduled_for, skill_nodes!intervention_retests_skill_node_id_fkey(node_name)",
      )
      .eq("user_id", userId)
      .is("completed_at", null)
      .order("scheduled_for", { ascending: true })
      .limit(1),
  ]);

  const raw = (rows?.[0] ?? null) as RetestRow | null;
  if (!raw) return null;

  const skillNodes = raw.skill_nodes;
  const nodeName = Array.isArray(skillNodes)
    ? skillNodes[0]?.node_name
    : skillNodes?.node_name;

  const scheduledMs = new Date(raw.scheduled_for).getTime();
  const nowMs = Date.now();
  const isDue = isInterventionRetestDue(raw.scheduled_for, nowMs);

  return {
    skillNodeId: String(raw.skill_node_id),
    nodeName: nodeName ?? "Skill node",
    scheduledFor: raw.scheduled_for,
    isDue,
    remainingMs: Math.max(0, scheduledMs - nowMs),
    priorityRetest: entitlements.momentumActive,
  };
}

export type LoopReportRow = {
  id: string;
  skillNodeId: string;
  nodeName: string;
  sourceType: string;
  scheduledFor: string;
  completedAt: string | null;
  preAccuracy: number | null;
  postAccuracy: number | null;
  delta: number | null;
  isDue: boolean;
};

export async function loadLoopReportRows(
  userId: string,
  options?: { limit?: number; fullHistory?: boolean },
): Promise<LoopReportRow[]> {
  const admin = createAdminClient();
  const limit = options?.fullHistory ? options.limit ?? 50 : 1;

  const { data: rows } = await admin
    .from("intervention_retests")
    .select(
      "id, skill_node_id, source_type, scheduled_for, completed_at, pre_accuracy, post_accuracy, delta, skill_nodes!intervention_retests_skill_node_id_fkey(node_name)",
    )
    .eq("user_id", userId)
    .order("scheduled_for", { ascending: false })
    .limit(limit);

  const nowMs = Date.now();
  return (rows ?? []).map((raw) => {
    const skillNodes = raw.skill_nodes as RetestRow["skill_nodes"];
    const nodeName = Array.isArray(skillNodes)
      ? skillNodes[0]?.node_name
      : skillNodes?.node_name;
    const scheduledFor = String(raw.scheduled_for);
    return {
      id: String(raw.id),
      skillNodeId: String(raw.skill_node_id),
      nodeName: nodeName ?? "Skill node",
      sourceType: String(raw.source_type),
      scheduledFor,
      completedAt: raw.completed_at ? String(raw.completed_at) : null,
      preAccuracy: raw.pre_accuracy == null ? null : Number(raw.pre_accuracy),
      postAccuracy: raw.post_accuracy == null ? null : Number(raw.post_accuracy),
      delta: raw.delta == null ? null : Number(raw.delta),
      isDue: !raw.completed_at && isInterventionRetestDue(scheduledFor, nowMs),
    };
  });
}

"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { isInterventionRetestDue } from "@/features/intervention-retests/schedule-intervention-retests-pure";
import { computeTrajectoryIndexForUser } from "@/features/trajectory-index/trajectory-index-snapshots";
import {
  buildLoopVelocityIndex,
  buildProofChainPanelData,
  computeMedianHours,
  stallDaysSince,
  type ProofChainPanelData,
} from "@/features/momentum-hub/proof-chain-pure";

type RetestRow = {
  id: string;
  skill_node_id: string;
  source_type: string;
  scheduled_for: string;
  completed_at: string | null;
  pre_accuracy: number | null;
  post_accuracy: number | null;
  delta: number | null;
  skill_nodes: { node_name: string } | { node_name: string }[] | null;
};

function nodeNameFromRow(row: RetestRow): string {
  const skillNodes = row.skill_nodes;
  if (Array.isArray(skillNodes)) return skillNodes[0]?.node_name ?? "Skill node";
  return skillNodes?.node_name ?? "Skill node";
}

function closureHours(scheduledFor: string, completedAt: string): number {
  const start = new Date(scheduledFor).getTime();
  const end = new Date(completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / (60 * 60 * 1000);
}

async function loadUserClosureHours(userId: string, sinceIso: string): Promise<number[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("intervention_retests")
    .select("scheduled_for, completed_at")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .gte("scheduled_for", sinceIso);

  return (data ?? [])
    .map((row) => closureHours(String(row.scheduled_for), String(row.completed_at)))
    .filter((hours) => hours > 0);
}

async function loadCohortClosureHours(sinceIso: string): Promise<number[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("intervention_retests")
    .select("user_id, scheduled_for, completed_at")
    .not("completed_at", "is", null)
    .gte("scheduled_for", sinceIso)
    .limit(2000);

  const byUser = new Map<string, number[]>();
  for (const row of data ?? []) {
    const hours = closureHours(String(row.scheduled_for), String(row.completed_at));
    if (hours <= 0) continue;
    const userId = String(row.user_id);
    const list = byUser.get(userId) ?? [];
    list.push(hours);
    byUser.set(userId, list);
  }

  return [...byUser.values()]
    .map((values) => computeMedianHours(values))
    .filter((value): value is number => value != null);
}

export async function loadProofChainPanel(): Promise<ProofChainPanelData | null> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const nowMs = Date.now();
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("intervention_retests")
    .select(
      "id, skill_node_id, source_type, scheduled_for, completed_at, pre_accuracy, post_accuracy, delta, skill_nodes!intervention_retests_skill_node_id_fkey(node_name)",
    )
    .eq("user_id", user.id)
    .order("scheduled_for", { ascending: false })
    .limit(40);

  const retests = (rows ?? []) as RetestRow[];
  const openRow =
    retests.find((row) => !row.completed_at && isInterventionRetestDue(row.scheduled_for, nowMs)) ??
    retests.find((row) => !row.completed_at) ??
    null;

  const closedRow = retests.find((row) => row.completed_at) ?? null;

  if (!openRow && !closedRow) return null;

  const trajectory = await computeTrajectoryIndexForUser(user.id);

  const [userClosureHours, cohortMedians] = await Promise.all([
    loadUserClosureHours(user.id, sinceIso),
    entitlements.momentumActive ? loadCohortClosureHours(sinceIso) : Promise.resolve([]),
  ]);

  const loopVelocity = entitlements.momentumActive
    ? buildLoopVelocityIndex({
        userMedianClosureHours: computeMedianHours(userClosureHours),
        cohortMedianClosureHours: computeMedianHours(cohortMedians),
        closedLoops30d: userClosureHours.length,
      })
    : null;

  const openLoop = openRow
    ? {
        skillNodeId: String(openRow.skill_node_id),
        nodeName: nodeNameFromRow(openRow),
        sourceType: String(openRow.source_type),
        scheduledFor: String(openRow.scheduled_for),
        preAccuracy: openRow.pre_accuracy == null ? null : Number(openRow.pre_accuracy),
        isDue: isInterventionRetestDue(openRow.scheduled_for, nowMs),
        priorityRetest: entitlements.momentumActive,
        stallDays: stallDaysSince(String(openRow.scheduled_for), nowMs),
      }
    : null;

  const closedLoop =
    closedRow?.completed_at &&
    closedRow.pre_accuracy != null &&
    closedRow.post_accuracy != null
      ? {
          nodeName: nodeNameFromRow(closedRow),
          sourceType: String(closedRow.source_type),
          preAccuracy: Number(closedRow.pre_accuracy),
          postAccuracy: Number(closedRow.post_accuracy),
          delta: closedRow.delta == null ? 0 : Number(closedRow.delta),
          closureHours: closureHours(String(closedRow.scheduled_for), String(closedRow.completed_at)),
        }
      : null;

  const closedLoops30d = retests.filter((row) => row.completed_at && String(row.scheduled_for) >= sinceIso).length;
  const totalLoops30d = retests.filter((row) => String(row.scheduled_for) >= sinceIso).length;

  return buildProofChainPanelData({
    momentumActive: entitlements.momentumActive,
    openLoop,
    closedLoop,
    trajectory,
    loopVelocity,
    closedLoops30d,
    totalLoops30d,
  });
}

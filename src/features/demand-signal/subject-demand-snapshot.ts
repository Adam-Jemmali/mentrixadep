/**
 * Subject demand snapshot — shared platform refresh + Guide reads.
 * Lazy hourly refresh on Guide home. Never a per-Guide live aggregate.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { createClient } from "@/shared/integrations/supabase/server";
import {
  buildGuideDemandSignals,
  type GuideDemandSignal,
  type SkillNodeWeeklyDemandRow,
} from "@/features/demand-signal/demand-signal-pure";
import { isDemandSnapshotStale } from "@/features/demand-signal/subject-demand-snapshot-pure";

function isMissingSnapshotTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("subject_demand_snapshot") ||
    message.includes("does not exist")
  );
}

/** One shared upsert if the snapshot is older than an hour. */
export async function ensureSubjectDemandSnapshotFresh(
  now = new Date(),
): Promise<"refreshed" | "fresh" | "skipped"> {
  const admin = createAdminClient();

  const { data: latest, error: readError } = await admin
    .from("subject_demand_snapshot")
    .select("computed_at")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) {
    if (isMissingSnapshotTable(readError)) return "skipped";
    console.warn("[subject-demand] freshness check failed:", readError.message);
    return "skipped";
  }

  if (!isDemandSnapshotStale(latest?.computed_at, now)) {
    return "fresh";
  }

  const { error: syncError } = await admin.rpc("sync_subject_demand_snapshot");
  if (syncError) {
    if (isMissingSnapshotTable(syncError)) return "skipped";
    console.warn("[subject-demand] sync failed:", syncError.message);
    return "skipped";
  }

  return "refreshed";
}

export async function loadSubjectDemandSnapshotRows(): Promise<
  SkillNodeWeeklyDemandRow[]
> {
  await ensureSubjectDemandSnapshotFresh();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subject_demand_snapshot")
    .select("subject, skill_node_id, students_weak_count, computed_at")
    .gt("students_weak_count", 0)
    .order("students_weak_count", { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingSnapshotTable(error)) return [];
    console.warn("[subject-demand] load failed:", error.message);
    return [];
  }

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const nodeIds = rows.map((row) => String(row.skill_node_id));
  const { data: nodes } = await supabase
    .from("skill_nodes")
    .select("id, node_name")
    .in("id", nodeIds);

  const nameById = new Map(
    (nodes ?? []).map((node) => [String(node.id), String(node.node_name)]),
  );

  return rows.map((row) => ({
    skillNodeId: String(row.skill_node_id),
    subject: String(row.subject),
    nodeName: nameById.get(String(row.skill_node_id)) ?? "Skill",
    weakStudentCount: Number(row.students_weak_count ?? 0),
    weekStart: String(row.computed_at ?? "").slice(0, 10),
  }));
}

export async function loadGuideDemandSignals(params: {
  verifiedCourseNames: string[];
  openAvailability: Array<{ course: string }>;
}): Promise<GuideDemandSignal[]> {
  const rows = await loadSubjectDemandSnapshotRows();
  return buildGuideDemandSignals({
    rows,
    verifiedCourseNames: params.verifiedCourseNames,
    openAvailability: params.openAvailability,
    limit: 3,
  });
}

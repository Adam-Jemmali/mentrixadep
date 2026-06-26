"use server";

import { createClient } from "@/shared/integrations/supabase/server";
import {
  buildGuideDemandSignals,
  formatUtcWeekStartMonday,
  type GuideDemandSignal,
  type SkillNodeWeeklyDemandRow,
} from "@/features/demand-signal/demand-signal-pure";

function isMissingDemandTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("skill_node_weekly_demand") ||
    message.includes("does not exist")
  );
}

export async function loadLatestWeeklyDemandRows(
  weekStart = formatUtcWeekStartMonday(new Date()),
): Promise<SkillNodeWeeklyDemandRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("skill_node_weekly_demand")
    .select("skill_node_id, subject, node_name, weak_student_count, week_start")
    .eq("week_start", weekStart)
    .order("weak_student_count", { ascending: false });

  if (error) {
    if (isMissingDemandTable(error)) return [];
    console.warn("[demand-signal] load failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    skillNodeId: String(row.skill_node_id),
    subject: String(row.subject),
    nodeName: String(row.node_name),
    weakStudentCount: Number(row.weak_student_count ?? 0),
    weekStart: String(row.week_start),
  }));
}

export async function loadGuideDemandSignals(params: {
  verifiedCourseNames: string[];
  openAvailability: Array<{ course: string }>;
}): Promise<GuideDemandSignal[]> {
  const rows = await loadLatestWeeklyDemandRows();
  return buildGuideDemandSignals({
    rows,
    verifiedCourseNames: params.verifiedCourseNames,
    openAvailability: params.openAvailability,
    limit: 3,
  });
}

/**
 * Guide weekly node impact reads — internal server-only (command center).
 * Not a server action module; import from trusted server code only.
 */

import { createClient } from "@/shared/integrations/supabase/server";
import { loadGuideImpactNodeStats } from "@/features/guidance/verdict-materialized-reads";
import type { ImpactNodeStat } from "@/features/guidance/verdict-engine-pure";
import {
  mapWeeklyNodeImpacts,
  type GuideWeeklyNodeImpact,
  type WeeklyTaughtNode,
} from "@/features/tutor/command-center-weekly-impact-pure";

type TargetNodeRow = {
  skill_node_id: string;
  skill_nodes: { node_name: string } | { node_name: string }[] | null;
};

function resolveNodeName(raw: TargetNodeRow["skill_nodes"]): string {
  if (!raw) return "Skill node";
  if (Array.isArray(raw)) return raw[0]?.node_name ?? "Skill node";
  return raw.node_name;
}

function dedupeTaughtNodes(rows: TargetNodeRow[]): WeeklyTaughtNode[] {
  const byId = new Map<string, WeeklyTaughtNode>();
  for (const row of rows) {
    const skillNodeId = String(row.skill_node_id);
    if (!byId.has(skillNodeId)) {
      byId.set(skillNodeId, {
        skillNodeId,
        nodeName: resolveNodeName(row.skill_nodes),
      });
    }
  }
  return [...byId.values()].sort((a, b) => a.nodeName.localeCompare(b.nodeName));
}

export async function loadGuideWeeklyNodeImpacts(
  guideId: string,
  sinceIso: string,
): Promise<GuideWeeklyNodeImpact[]> {
  const supabase = await createClient();

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id")
    .eq("tutor_id", guideId)
    .eq("status", "completed")
    .gte("end_time", sinceIso);

  if (sessionsError) {
    console.warn("[tutor] weekly impact sessions query failed:", sessionsError.message);
    return [];
  }

  const sessionIds = (sessions ?? []).map((row) => String(row.id));
  if (sessionIds.length === 0) return [];

  const { data: targetRows, error: targetError } = await supabase
    .from("session_target_nodes")
    .select("skill_node_id, skill_nodes(node_name)")
    .in("session_id", sessionIds);

  if (targetError) {
    console.warn("[tutor] weekly impact target nodes query failed:", targetError.message);
    return [];
  }

  const taughtNodes = dedupeTaughtNodes((targetRows ?? []) as TargetNodeRow[]);
  if (taughtNodes.length === 0) return [];

  const rollingStats = await loadGuideImpactNodeStats(guideId);
  const statsByNodeId = new Map<string, ImpactNodeStat>(
    rollingStats.map((row) => [row.skillNodeId, row]),
  );

  return mapWeeklyNodeImpacts(taughtNodes, statsByNodeId);
}

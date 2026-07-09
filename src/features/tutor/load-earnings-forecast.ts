"use server";

import { loadGuideImpactNodeStats } from "@/features/guidance/verdict-materialized-reads";
import { loadLatestWeeklyDemandRows } from "@/features/demand-signal/reads";
import { createClient } from "@/shared/integrations/supabase/server";
import {
  buildEarningsForecastLine,
  pickStrongestImpactNodeId,
} from "@/features/tutor/earnings-forecast-pure";

export async function loadGuideEarningsForecastLine(params: {
  guideId: string;
  openSlots: Array<{ course: string }>;
}): Promise<string | null> {
  const impactNodes = await loadGuideImpactNodeStats(params.guideId);
  const strongestImpactSkillNodeId = pickStrongestImpactNodeId(
    impactNodes.map((node) => ({
      skillNodeId: node.skillNodeId,
      impactLift: node.impactLift,
      impactScore: node.impactScore,
    })),
  );
  if (!strongestImpactSkillNodeId) return null;

  const demandRows = await loadLatestWeeklyDemandRows();
  const demandRow = demandRows.find((row) => row.skillNodeId === strongestImpactSkillNodeId);

  let course = demandRow?.subject ?? null;
  if (!course) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("skill_nodes")
      .select("subject")
      .eq("id", strongestImpactSkillNodeId)
      .maybeSingle();
    course = data?.subject ? String(data.subject) : null;
  }

  return buildEarningsForecastLine({
    strongestImpactSkillNodeId,
    course,
    demandRows,
    openSlots: params.openSlots,
  });
}

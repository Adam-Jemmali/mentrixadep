/**
 * Guide earnings forecast — internal server-only (command center).
 */

import { loadGuideImpactNodeStats } from "@/features/guidance/verdict-materialized-reads";
import { loadLatestWeeklyDemandRows } from "@/features/demand-signal/reads";
import { createClient } from "@/shared/integrations/supabase/server";
import {
  buildGuideEarningsForecast,
  pickStrongestImpactNodeId,
  type GuideEarningsForecastView,
} from "@/features/tutor/earnings-forecast-pure";

export async function loadGuideEarningsForecast(params: {
  guideId: string;
  openSlots: Array<{ course: string; price_per_session?: number | null }>;
  sessionsThisMonth: number;
  sessionRatesCents: number[];
  daysElapsedInMonth: number;
}): Promise<GuideEarningsForecastView | null> {
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

  return buildGuideEarningsForecast({
    strongestImpactSkillNodeId,
    course,
    demandRows,
    openSlots: params.openSlots,
    sessionsThisMonth: params.sessionsThisMonth,
    sessionRatesCents: params.sessionRatesCents,
    daysElapsedInMonth: params.daysElapsedInMonth,
  });
}

/** @deprecated Use loadGuideEarningsForecast */
export async function loadGuideEarningsForecastLine(params: {
  guideId: string;
  openSlots: Array<{ course: string }>;
}): Promise<string | null> {
  const view = await loadGuideEarningsForecast({
    guideId: params.guideId,
    openSlots: params.openSlots,
    sessionsThisMonth: 0,
    sessionRatesCents: [],
    daysElapsedInMonth: 1,
  });
  if (!view) return null;
  if (view.demandSecondary) {
    return `${view.demandPrimary} ${view.demandSecondary}`;
  }
  return view.demandPrimary;
}

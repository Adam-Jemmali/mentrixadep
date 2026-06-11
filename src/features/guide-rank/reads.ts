"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { createClient } from "@/shared/integrations/supabase/server";

export type GuideBreakthrough = {
  concept: string;
  prePercent: number;
  postPercent: number;
};

export async function getGuideRanksMap(
  guideIds: string[],
): Promise<Record<string, string>> {
  if (guideIds.length === 0) return {};
  await requireRole(["student", "admin", "tutor"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, guide_rank")
    .in("id", guideIds)
    .eq("role", "tutor");

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id] = (row.guide_rank as string) ?? "practitioner";
  }
  return map;
}

export async function getGuideBreakthroughs(
  guideId: string,
  limit = 5,
): Promise<GuideBreakthrough[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_guide_breakthroughs", {
    p_guide_id: guideId,
    p_limit: limit,
  });
  if (error) return [];
  return (data ?? []).map((row: { concept: string; pre_percent: number; post_percent: number }) => ({
    concept: row.concept,
    prePercent: Number(row.pre_percent),
    postPercent: Number(row.post_percent),
  }));
}

export async function getGuideImpactHistory(
  guideId: string,
  days = 30,
): Promise<{ date: string; impactScore: number }[]> {
  await requireRole(["tutor", "admin"]);
  const supabase = await createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  const { data } = await supabase
    .from("guide_impact_history")
    .select("recorded_at, impact_score")
    .eq("guide_id", guideId)
    .gte("recorded_at", since.toISOString().slice(0, 10))
    .order("recorded_at", { ascending: true });

  const byDate = new Map<string, number[]>();
  for (const row of data ?? []) {
    const date = String(row.recorded_at).slice(0, 10);
    const scores = byDate.get(date) ?? [];
    scores.push(Number(row.impact_score));
    byDate.set(date, scores);
  }

  const points: { date: string; impactScore: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const scores = byDate.get(key);
    points.push({
      date: key,
      impactScore:
        scores && scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0,
    });
  }
  return points;
}

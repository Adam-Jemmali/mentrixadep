"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getUtcWeekMondayString } from "@/features/divisions/division-week";
import { questAccuracyPoints } from "@/features/division-wars/scoring-pure";

/**
 * Record quest accuracy toward active division wars for the student's division.
 * Fire-and-forget safe — never throws to quest completion callers.
 */
export async function recordDivisionWarQuestContribution(params: {
  studentId: string;
  divisionKey: string;
  correct: number;
  total: number;
}): Promise<void> {
  try {
    const points = questAccuracyPoints(params.correct, params.total);
    if (points <= 0) return;

    const admin = createAdminClient();
    const weekStart = getUtcWeekMondayString();

    const { data: division } = await admin
      .from("divisions")
      .select("id")
      .eq("key", params.divisionKey.trim())
      .maybeSingle();

    if (!division?.id) return;

    const { data: wars } = await admin
      .from("division_wars")
      .select("id, division_a_id, division_b_id")
      .eq("week_start", weekStart)
      .eq("status", "active")
      .or(`division_a_id.eq.${division.id},division_b_id.eq.${division.id}`);

    for (const war of wars ?? []) {
      if (war.division_a_id !== division.id && war.division_b_id !== division.id) continue;

      const { data: existing } = await admin
        .from("division_war_contributions")
        .select("id, quests_completed, total_accuracy_points")
        .eq("war_id", war.id)
        .eq("student_id", params.studentId)
        .maybeSingle();

      const prevQuests = existing?.quests_completed ?? 0;
      const prevPoints = Number(existing?.total_accuracy_points ?? 0);

      await admin.from("division_war_contributions").upsert(
        {
          war_id: war.id,
          student_id: params.studentId,
          division_id: division.id,
          quests_completed: prevQuests + 1,
          total_accuracy_points: prevPoints + points,
          last_updated: new Date().toISOString(),
        },
        { onConflict: "war_id,student_id" },
      );
    }
  } catch {
    // Never block quest completion
  }
}

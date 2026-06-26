import { NextResponse } from "next/server";
import { createClient } from "@/shared/integrations/supabase/server";
import {
  formatVerifiedRankNextAction,
  formatVerifiedRankVerdict,
  getCalibratedRank,
  loadVerifiedFirstAttemptRankStats,
} from "@/features/xp/calibrated-rank";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";

/** Completed session count + verified rank for PWA offline cache and navbar. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ count }, xpRow, verifiedStats, calibrated] = await Promise.all([
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("status", "completed"),
    supabase.from("user_xp").select("total_xp, streak_days").eq("user_id", user.id).maybeSingle(),
    loadVerifiedFirstAttemptRankStats(user.id),
    getCalibratedRank(user.id, AP_CALC_AB_SUBJECT),
  ]);

  return NextResponse.json({
    completedSessions: count ?? 0,
    totalXp: xpRow.data?.total_xp ?? 0,
    streakDays: xpRow.data?.streak_days ?? 0,
    verifiedCount: verifiedStats.verifiedCount,
    verifiedAccuracyPercent: verifiedStats.accuracyPercent,
    verifiedPercentile: verifiedStats.percentile,
    rankVerdict: formatVerifiedRankVerdict(verifiedStats),
    rankNextAction: formatVerifiedRankNextAction(verifiedStats),
    rankTitle: calibrated.title,
    rankLevel: calibrated.level,
    rankSource: calibrated.source,
  });
}

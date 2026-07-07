import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  buildTrajectoryIndex,
  type TrajectoryIndexResult,
} from "@/features/trajectory-index/trajectory-index-pure";
import type { TrajectoryHistoryPoint } from "@/features/momentum-hub/momentum-trajectory-enrichment-pure";

export async function computeTrajectoryIndexForUser(
  userId: string,
): Promise<TrajectoryIndexResult> {
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();
  const admin = createAdminClient();

  const [verifiedResult, retestsResult] = await Promise.all([
    admin
      .from("verified_first_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_correct", true)
      .gte("attempted_at", sinceIso),
    admin
      .from("intervention_retests")
      .select("completed_at, delta, scheduled_for")
      .eq("user_id", userId)
      .gte("scheduled_for", sinceIso),
  ]);

  const retests = retestsResult.data ?? [];
  const completed = retests.filter((row) => row.completed_at);
  const duePast = retests.filter(
    (row) => !row.completed_at && String(row.scheduled_for) < nowIso,
  );
  const positiveLoops = completed.filter(
    (row) => row.delta != null && Number(row.delta) > 0,
  ).length;

  return buildTrajectoryIndex({
    verifiedNodesGained30d: verifiedResult.count ?? 0,
    retestsCompleted30d: completed.length,
    retestsDuePast30d: duePast.length,
    positiveLoops30d: positiveLoops,
  });
}

export async function upsertTrajectoryIndexSnapshot(
  userId: string,
  result: TrajectoryIndexResult,
): Promise<void> {
  const admin = createAdminClient();
  const snapshotDate = new Date().toISOString().slice(0, 10);
  await admin.from("trajectory_index_snapshots").upsert(
    {
      user_id: userId,
      subject: AP_CALC_AB_SUBJECT,
      score: result.score,
      components: {
        verified: result.verifiedComponent,
        retest: result.retestComponent,
        loop: result.loopComponent,
      },
      snapshot_date: snapshotDate,
    },
    { onConflict: "user_id,subject,snapshot_date" },
  );
}

export async function loadTrajectoryIndexHistory(
  userId: string,
  days = 30,
): Promise<TrajectoryHistoryPoint[]> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data } = await admin
    .from("trajectory_index_snapshots")
    .select("snapshot_date, score")
    .eq("user_id", userId)
    .eq("subject", AP_CALC_AB_SUBJECT)
    .gte("snapshot_date", since)
    .order("snapshot_date", { ascending: true });

  return (data ?? []).map((row) => ({
    date: String(row.snapshot_date),
    score: Number(row.score),
  }));
}

export function priorWeekScoreFromHistory(history: TrajectoryHistoryPoint[]): number | null {
  if (history.length < 2) return null;
  const prior = history[history.length - 2];
  return prior?.score ?? null;
}

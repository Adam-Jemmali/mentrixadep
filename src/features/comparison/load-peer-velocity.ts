import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { buildPeerVelocitySnapshot } from "@/features/comparison/peer-velocity-pure";
import type { MovementReceiptData } from "@/features/movement-receipt/types";

export async function loadCohortWeeklyVerifiedCounts(weekStart: Date): Promise<number[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("verified_first_attempts")
    .select("user_id")
    .gte("attempted_at", weekStart.toISOString());

  if (error) {
    console.warn("[loadPeerVelocityForWeek] cohort read failed:", error.message);
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const userId = String(row.user_id);
    counts.set(userId, (counts.get(userId) ?? 0) + 1);
  }

  return [...counts.values()];
}

export async function loadPeerVelocityForWeek(input: {
  userId: string;
  userVerifiedThisWeek: number;
  weekStart: Date;
}): Promise<MovementReceiptData["peer"]> {
  const cohortCounts = await loadCohortWeeklyVerifiedCounts(input.weekStart);
  const snapshot = buildPeerVelocitySnapshot({
    userVerifiedThisWeek: input.userVerifiedThisWeek,
    cohortCounts,
  });

  if (!snapshot) return null;

  return {
    userVerifiedThisWeek: snapshot.userVerifiedThisWeek,
    cohortMedian: snapshot.cohortMedian,
    sampleSize: snapshot.sampleSize,
  };
}

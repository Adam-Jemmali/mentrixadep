import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { AccuracyBucketRow } from "@/features/comparison/comparison-context-pure";

/**
 * Reads precomputed node_percentile_snapshot rows only — never a live aggregate.
 */
export async function loadGuestComparisonBuckets(
  skillNodeId: string,
): Promise<AccuracyBucketRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("node_percentile_snapshot")
    .select("accuracy_bucket, user_count")
    .eq("skill_node_id", skillNodeId);

  if (error || !data?.length) return [];

  return data
    .map((row) => ({
      accuracyBucket: Number(row.accuracy_bucket),
      userCount: Number(row.user_count),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.accuracyBucket) &&
        Number.isFinite(row.userCount) &&
        row.userCount >= 0,
    );
}

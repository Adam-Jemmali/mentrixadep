import { z } from "zod";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getVerdict } from "@/features/guidance/verdict-engine";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import { loadVerifiedRankCache } from "@/features/guidance/verdict-materialized-reads";

const lastSeenRankStateSchema = z.object({
  accuracyPercent: z.number(),
  percentile: z.number().nullable(),
  verifiedCount: z.number().int().min(0),
  recordedAt: z.string(),
});

function parseLastSeenState(raw: unknown) {
  const parsed = lastSeenRankStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Read-only rank_delta verdict for the public passport. Does not mutate last_seen_state. */
export async function loadRankPassportVerdict(userId: string): Promise<Verdict> {
  const admin = createAdminClient();
  const current = await loadVerifiedRankCache(userId);

  const { data: settings } = await admin
    .from("user_settings")
    .select("last_seen_state")
    .eq("user_id", userId)
    .maybeSingle();

  const baseline = parseLastSeenState(settings?.last_seen_state);

  return getVerdict({
    type: "rank_delta",
    userId,
    value: current.accuracyPercent,
    previousValue: baseline?.accuracyPercent,
    context: {
      previousPercentile: baseline?.percentile ?? null,
      previousAccuracyPercent: baseline?.accuracyPercent,
    },
  });
}

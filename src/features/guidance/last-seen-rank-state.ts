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

export type LastSeenRankState = z.infer<typeof lastSeenRankStateSchema>;

function parseLastSeenState(raw: unknown): LastSeenRankState | null {
  const parsed = lastSeenRankStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function loadMasteryGridRankVerdict(userId: string): Promise<Verdict> {
  const admin = createAdminClient();
  const current = await loadVerifiedRankCache(userId);

  const { data: settings } = await admin
    .from("user_settings")
    .select("last_seen_state")
    .eq("user_id", userId)
    .maybeSingle();

  const baseline = parseLastSeenState(settings?.last_seen_state);

  const verdict = await getVerdict({
    type: "rank_delta",
    userId,
    value: current.accuracyPercent,
    previousValue: baseline?.accuracyPercent,
    context: {
      previousPercentile: baseline?.percentile ?? null,
      previousAccuracyPercent: baseline?.accuracyPercent,
    },
  });

  const nextState: LastSeenRankState = {
    accuracyPercent: current.accuracyPercent,
    percentile: current.percentile,
    verifiedCount: current.verifiedCount,
    recordedAt: new Date().toISOString(),
  };

  const { data: updated } = await admin
    .from("user_settings")
    .update({
      last_seen_state: nextState,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  if (!updated) {
    await admin.from("user_settings").insert({
      user_id: userId,
      last_seen_state: nextState,
    });
  }

  return verdict;
}

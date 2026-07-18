import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { loadVerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import {
  shouldIssueNewCertification,
  shouldReinstateCertification,
  type CertificationEligibilityInput,
} from "@/features/certifications/certification-pure";

type Admin = ReturnType<typeof createAdminClient>;

async function loadApCalcTotalNodes(admin: Admin): Promise<number> {
  const { data, error } = await admin.rpc("count_ap_calc_ab_skill_nodes");
  if (!error && typeof data === "number" && Number.isFinite(data)) {
    return data;
  }
  const { count } = await admin
    .from("skill_nodes")
    .select("id", { count: "exact", head: true })
    .eq("subject", AP_CALC_AB_SUBJECT);
  return count ?? 0;
}

async function loadVfaStreakLongest(admin: Admin, userId: string): Promise<number> {
  const { data } = await admin
    .from("user_settings")
    .select("vfa_streak_longest")
    .eq("user_id", userId)
    .maybeSingle();
  return Number(data?.vfa_streak_longest ?? 0);
}

export async function buildCertificationEligibilityInput(
  userId: string,
): Promise<CertificationEligibilityInput> {
  const admin = createAdminClient();
  const [stats, totalNodes, streak] = await Promise.all([
    loadVerifiedFirstAttemptRankStats(userId),
    loadApCalcTotalNodes(admin),
    loadVfaStreakLongest(admin, userId),
  ]);
  return {
    verifiedPercentile: stats.percentile,
    nodesVerified: stats.verifiedCount,
    totalNodes,
    vfaStreakLongest: streak,
  };
}

async function loadAccuracyOverall(userId: string): Promise<number> {
  const stats = await loadVerifiedFirstAttemptRankStats(userId);
  return stats.accuracyPercent;
}

/**
 * Call after VFA updates when calibrated peer standing may have moved.
 * Issues only on first cross of 90. Reinstates revoked certs when eligible again.
 */
export async function maybeIssueOrReinstateCertification(params: {
  userId: string;
  previousPercentile: number | null;
}): Promise<"issued" | "reinstated" | "noop"> {
  const admin = createAdminClient();
  const userId = params.userId;

  const { data: existing } = await admin
    .from("mentrixa_certifications")
    .select("id, revoked_at, verification_token")
    .eq("user_id", userId)
    .eq("subject", AP_CALC_AB_SUBJECT)
    .maybeSingle();

  const current = await buildCertificationEligibilityInput(userId);
  const accuracy = await loadAccuracyOverall(userId);
  const alreadyHasRow = Boolean(existing);

  if (
    shouldIssueNewCertification({
      previousPercentile: params.previousPercentile,
      current,
      alreadyHasRow,
    })
  ) {
    const { error } = await admin.from("mentrixa_certifications").insert({
      user_id: userId,
      subject: AP_CALC_AB_SUBJECT,
      verified_percentile: current.verifiedPercentile!,
      nodes_verified: current.nodesVerified,
      total_nodes: current.totalNodes,
      accuracy_overall: accuracy,
    });
    if (error) {
      console.error("[certification] issue", userId, error.message);
      return "noop";
    }
    return "issued";
  }

  if (
    existing?.revoked_at &&
    shouldReinstateCertification({ isRevoked: true, current })
  ) {
    const { error } = await admin
      .from("mentrixa_certifications")
      .update({
        revoked_at: null,
        revoke_reason: null,
        below_threshold_since: null,
        verified_percentile: current.verifiedPercentile!,
        nodes_verified: current.nodesVerified,
        total_nodes: current.totalNodes,
        accuracy_overall: accuracy,
      })
      .eq("id", existing.id);
    if (error) {
      console.error("[certification] reinstate", userId, error.message);
      return "noop";
    }
    return "reinstated";
  }

  return "noop";
}

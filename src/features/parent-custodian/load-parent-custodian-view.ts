import { createHash } from "node:crypto";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { loadVerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import { buildParentCustodianViewCopy } from "@/features/parent-custodian/parent-custodian-pure";
import { firstNameFromDisplayName } from "@/features/student-profile/student-dashboard-helpers";
import { buildTrajectoryIndex } from "@/features/trajectory-index/trajectory-index-pure";

export type ParentCustodianViewModel = {
  studentFirstName: string;
  verdict: string;
  nextAction: string;
  verifiedPercentile: number | null;
  trajectoryScore: number | null;
  subject: string;
};

export async function loadParentCustodianView(token: string): Promise<ParentCustodianViewModel | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: invite } = await admin
    .from("parent_custodian_invites")
    .select("id, student_id, custodian_email, expires_at, accepted_at, revoked_at")
    .eq("invite_token_hash", tokenHash)
    .maybeSingle();

  if (!invite || invite.revoked_at || String(invite.expires_at) < nowIso) {
    return null;
  }

  if (!invite.accepted_at) {
    await admin
      .from("parent_custodian_invites")
      .update({ accepted_at: nowIso })
      .eq("id", invite.id);

    await admin.from("parent_custodian_access").upsert(
      {
        student_id: invite.student_id,
        custodian_email: invite.custodian_email,
        invite_id: invite.id,
      },
      { onConflict: "student_id,custodian_email" },
    );
  }

  const studentId = String(invite.student_id);
  const [userRow, rankStats, verifiedCount, retests] = await Promise.all([
    admin.from("users").select("display_name, email").eq("id", studentId).maybeSingle(),
    loadVerifiedFirstAttemptRankStats(studentId),
    admin
      .from("verified_first_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", studentId)
      .eq("is_correct", true)
      .gte("attempted_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    admin
      .from("intervention_retests")
      .select("completed_at, delta, scheduled_for")
      .eq("user_id", studentId)
      .gte("scheduled_for", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const retestRows = retests.data ?? [];
  const completed = retestRows.filter((row) => row.completed_at);
  const duePast = retestRows.filter(
    (row) => !row.completed_at && String(row.scheduled_for) < nowIso,
  );
  const positiveLoops = completed.filter((row) => row.delta != null && Number(row.delta) > 0).length;
  const trajectory = buildTrajectoryIndex({
    verifiedNodesGained30d: verifiedCount.count ?? 0,
    retestsCompleted30d: completed.length,
    retestsDuePast30d: duePast.length,
    positiveLoops30d: positiveLoops,
  });

  const displayName = userRow.data?.display_name ?? userRow.data?.email ?? "Student";
  const studentFirstName = firstNameFromDisplayName(displayName, userRow.data?.email ?? "Student");
  const copy = buildParentCustodianViewCopy({
    studentFirstName,
    trajectoryScore: trajectory.score,
    verifiedPercentile: rankStats.percentile,
  });

  return {
    studentFirstName,
    verdict: copy.verdict,
    nextAction: copy.nextAction,
    verifiedPercentile: rankStats.percentile,
    trajectoryScore: trajectory.score,
    subject: AP_CALC_AB_SUBJECT,
  };
}

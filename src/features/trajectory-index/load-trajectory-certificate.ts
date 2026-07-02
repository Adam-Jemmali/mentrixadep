"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getStudentEntitlements, hasEntitlement } from "@/features/entitlements/entitlements";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { loadVerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import { loadTrajectoryIndexForViewer } from "@/features/trajectory-index/load-trajectory-index";
import {
  buildTrajectoryCertificateVerdict,
  type TrajectoryCertificateData,
} from "@/features/trajectory-index/trajectory-certificate-pure";
import { firstNameFromDisplayName } from "@/features/student-profile/student-dashboard-helpers";

export type TrajectoryCertificateViewModel = TrajectoryCertificateData & {
  verdict: string;
  nextAction: string;
};

export async function loadTrajectoryCertificateForViewer(): Promise<TrajectoryCertificateViewModel | null> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  if (!hasEntitlement(entitlements, "momentum.certificate_export")) {
    return null;
  }

  const admin = createAdminClient();
  const [userRow, rankStats, trajectory, receiptCount] = await Promise.all([
    admin.from("users").select("display_name, email").eq("id", user.id).maybeSingle(),
    loadVerifiedFirstAttemptRankStats(user.id),
    loadTrajectoryIndexForViewer().catch(() => null),
    admin
      .from("movement_receipts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id),
  ]);

  const displayName = userRow.data?.display_name ?? userRow.data?.email ?? "Student";
  const data: TrajectoryCertificateData = {
    studentName: firstNameFromDisplayName(displayName, userRow.data?.email ?? "Student"),
    subject: AP_CALC_AB_SUBJECT,
    verifiedPercentile: rankStats.percentile,
    trajectoryScore: trajectory?.score ?? null,
    generatedOn: new Date().toISOString().slice(0, 10),
    archiveWeeks: receiptCount.count ?? 0,
  };

  const copy = buildTrajectoryCertificateVerdict(data);

  await admin.from("trajectory_certificate_exports").insert({
    user_id: user.id,
    verified_percentile: rankStats.percentile,
    export_kind: "trajectory_archive",
  });

  return { ...data, ...copy };
}

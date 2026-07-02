"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getStudentEntitlements, hasEntitlement } from "@/features/entitlements/entitlements";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { loadTrajectoryIndexForViewer } from "@/features/trajectory-index/load-trajectory-index";
import { buildUnifiedTrajectoryIndex, type UnifiedTrajectoryIndex } from "@/features/trajectory-index/cross-subject-trajectory-pure";
import { loadMomentumEligibleSubjects } from "@/features/subject-expansion/load-subject-momentum-gates";

export async function loadUnifiedTrajectoryIndexForViewer(): Promise<UnifiedTrajectoryIndex | null> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  if (!hasEntitlement(entitlements, "momentum.unified_trajectory")) {
    return null;
  }

  const subjects = await loadMomentumEligibleSubjects();
  const eligibleSubjects = subjects.length > 0 ? subjects : [AP_CALC_AB_SUBJECT];
  const subjectScores: { subject: string; score: number }[] = [];

  for (const subject of eligibleSubjects) {
    if (subject !== AP_CALC_AB_SUBJECT) continue;
    const index = await loadTrajectoryIndexForViewer();
    if (index) {
      subjectScores.push({ subject, score: index.score });
    }
  }

  const unified = buildUnifiedTrajectoryIndex(subjectScores);
  if (!unified) return null;

  const admin = createAdminClient();
  const snapshotDate = new Date().toISOString().slice(0, 10);
  await admin.from("unified_trajectory_snapshots").upsert(
    {
      user_id: user.id,
      score: unified.score,
      subject_scores: unified.subjectScores,
      snapshot_date: snapshotDate,
    },
    { onConflict: "user_id,snapshot_date" },
  );

  return unified;
}

"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { getStudentEntitlements, hasEntitlement } from "@/features/entitlements/entitlements";
import {
  buildTrajectoryIndex,
  type TrajectoryIndexResult,
} from "@/features/trajectory-index/trajectory-index-pure";

export async function loadTrajectoryIndexForViewer(): Promise<TrajectoryIndexResult | null> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  if (!hasEntitlement(entitlements, "momentum.trajectory_index")) {
    return null;
  }

  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();
  const supabase = await createClient();

  const [verifiedResult, retestsResult] = await Promise.all([
    supabase
      .from("verified_first_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_correct", true)
      .gte("attempted_at", sinceIso),
    supabase
      .from("intervention_retests")
      .select("completed_at, delta, scheduled_for")
      .eq("user_id", user.id)
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

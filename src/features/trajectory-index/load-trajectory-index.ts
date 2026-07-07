"use server";

import { requireRole } from "@/shared/core/auth";
import { getStudentEntitlements, hasEntitlement } from "@/features/entitlements/entitlements";
import type { TrajectoryIndexResult } from "@/features/trajectory-index/trajectory-index-pure";
import { computeTrajectoryIndexForUser } from "@/features/trajectory-index/trajectory-index-snapshots";

export async function loadTrajectoryIndexForViewer(): Promise<TrajectoryIndexResult | null> {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  if (!hasEntitlement(entitlements, "momentum.trajectory_index")) {
    return null;
  }

  return computeTrajectoryIndexForUser(user.id);
}

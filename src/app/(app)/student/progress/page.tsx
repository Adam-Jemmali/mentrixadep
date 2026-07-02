import { requireRole } from "@/shared/core/auth";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { loadProgressSnapshotArchive } from "@/features/progress-snapshot/load-archive";
import { ProgressArchiveClient } from "./progress-archive-client";

export default async function ProgressDashboardPage() {
  const user = await requireRole(["student", "admin"]);
  const entitlements = await getStudentEntitlements(user.id);
  const snapshots = await loadProgressSnapshotArchive();

  return (
    <ProgressArchiveClient
      snapshots={snapshots}
      momentumActive={entitlements.momentumActive}
    />
  );
}

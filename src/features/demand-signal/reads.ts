/**
 * Weekly demand reads — internal server-only (guide command center).
 * Guide home uses subject_demand_snapshot with lazy hourly refresh.
 */

export {
  loadGuideDemandSignals,
  loadSubjectDemandSnapshotRows,
  ensureSubjectDemandSnapshotFresh,
} from "@/features/demand-signal/subject-demand-snapshot";

import { loadSubjectDemandSnapshotRows } from "@/features/demand-signal/subject-demand-snapshot";
import type { SkillNodeWeeklyDemandRow } from "@/features/demand-signal/demand-signal-pure";

/** @deprecated Prefer loadSubjectDemandSnapshotRows. Kept for earnings forecast. */
export async function loadLatestWeeklyDemandRows(): Promise<SkillNodeWeeklyDemandRow[]> {
  return loadSubjectDemandSnapshotRows();
}

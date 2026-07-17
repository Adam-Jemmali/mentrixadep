/** Shared demand snapshot freshness. No cron. */

export const DEMAND_SNAPSHOT_STALE_MS = 60 * 60 * 1000;

export function isDemandSnapshotStale(
  computedAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!computedAt) return true;
  const t = Date.parse(computedAt);
  if (!Number.isFinite(t)) return true;
  return now.getTime() - t >= DEMAND_SNAPSHOT_STALE_MS;
}

export function formatSubjectDemandRowLine(
  nodeName: string,
  studentsWeakCount: number,
): string {
  const n = Math.max(0, Math.round(studentsWeakCount));
  const noun = n === 1 ? "student" : "students";
  const node = nodeName.trim() || "This skill";
  return `${node} weak for ${n} ${noun}`;
}

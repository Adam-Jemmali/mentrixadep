/** Max acceptable lag between job enqueue and completion (GitHub cron every 15 min). */
export const BACKGROUND_JOB_MAX_LAG_MS = 20 * 60 * 1000;

export function backgroundJobLagMs(
  createdAt: string,
  completedAt: string,
): number | null {
  const createdMs = new Date(createdAt).getTime();
  const completedMs = new Date(completedAt).getTime();
  if (!Number.isFinite(createdMs) || !Number.isFinite(completedMs)) return null;
  return completedMs - createdMs;
}

export function isBackgroundJobWithinSla(
  createdAt: string,
  completedAt: string,
  maxLagMs = BACKGROUND_JOB_MAX_LAG_MS,
): boolean {
  const lag = backgroundJobLagMs(createdAt, completedAt);
  if (lag == null) return false;
  return lag >= 0 && lag <= maxLagMs;
}

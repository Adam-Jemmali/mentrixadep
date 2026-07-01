export const STUDIO_INTERVENTION_RETEST_DELAY_MS = 48 * 60 * 60 * 1000;
export const DUEL_LOSS_RETEST_DELAY_MS = 72 * 60 * 60 * 1000;

export type InterventionSourceType =
  | "studio_package"
  | "session"
  | "breakthrough"
  | "duel_loss";

export function addInterventionRetestDelay(
  base: Date,
  sourceType: InterventionSourceType,
): Date {
  const delayMs =
    sourceType === "duel_loss"
      ? DUEL_LOSS_RETEST_DELAY_MS
      : STUDIO_INTERVENTION_RETEST_DELAY_MS;
  return new Date(base.getTime() + delayMs);
}

export function isInterventionRetestDue(
  scheduledFor: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!scheduledFor) return false;
  const scheduledMs = new Date(scheduledFor).getTime();
  if (!Number.isFinite(scheduledMs)) return false;
  return scheduledMs <= nowMs;
}

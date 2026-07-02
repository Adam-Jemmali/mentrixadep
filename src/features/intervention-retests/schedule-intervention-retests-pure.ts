export const STUDIO_INTERVENTION_RETEST_DELAY_MS = 48 * 60 * 60 * 1000;
export const DUEL_LOSS_RETEST_DELAY_MS = 72 * 60 * 60 * 1000;
export const MOMENTUM_STUDIO_INTERVENTION_RETEST_DELAY_MS = 24 * 60 * 60 * 1000;
export const MOMENTUM_DUEL_LOSS_RETEST_DELAY_MS = 36 * 60 * 60 * 1000;

export type InterventionSourceType =
  | "studio_package"
  | "session"
  | "breakthrough"
  | "duel_loss";

export function interventionRetestDelayMs(
  sourceType: InterventionSourceType,
  options?: { priorityRetest?: boolean },
): number {
  const priority = options?.priorityRetest === true;
  if (sourceType === "duel_loss") {
    return priority ? MOMENTUM_DUEL_LOSS_RETEST_DELAY_MS : DUEL_LOSS_RETEST_DELAY_MS;
  }
  return priority ? MOMENTUM_STUDIO_INTERVENTION_RETEST_DELAY_MS : STUDIO_INTERVENTION_RETEST_DELAY_MS;
}

export function addInterventionRetestDelay(
  base: Date,
  sourceType: InterventionSourceType,
  options?: { priorityRetest?: boolean },
): Date {
  return new Date(base.getTime() + interventionRetestDelayMs(sourceType, options));
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

export function formatRetestCountdownMs(remainingMs: number): string {
  if (remainingMs <= 0) return "now";
  const totalHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (totalHours >= 48) {
    const days = Math.ceil(totalHours / 24);
    return `${days}d`;
  }
  return `${totalHours}h`;
}

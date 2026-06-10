/**
 * Student-initiated cancellation refund window (pure helpers for actions + tests).
 */

export const STUDENT_REFUND_WINDOW_HOURS = 24;

/** Hours until session start (positive = in the future). */
export function hoursUntilSessionStart(sessionStartIso: string, nowMs: number = Date.now()): number {
  return (new Date(sessionStartIso).getTime() - nowMs) / 3_600_000;
}

/** Full refund when cancelling more than 24 hours before start (strictly greater than 24h). */
export function isStudentCancelRefundEligible(sessionStartIso: string, nowMs: number = Date.now()): boolean {
  return hoursUntilSessionStart(sessionStartIso, nowMs) > STUDENT_REFUND_WINDOW_HOURS;
}

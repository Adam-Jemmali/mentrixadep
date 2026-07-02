import {
  formatStudentMomentumAlumniAnnualPrice,
  MOMENTUM_ALUMNI_CREDITS_PER_QUARTER,
} from "@/features/booking/booking-pricing";

export type AlumniQuarterKey = `${number}-Q${1 | 2 | 3 | 4}`;

/** UTC calendar quarter key (YYYY-Qn). */
export function utcQuarterKey(date: Date = new Date()): AlumniQuarterKey {
  const quarter = (Math.floor(date.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  return `${date.getUTCFullYear()}-Q${quarter}`;
}

/** First day of the UTC quarter as YYYY-MM-DD (used as period_month for alumni credits). */
export function utcQuarterPeriodMonth(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3);
  const month = String(quarter * 3 + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function buildAlumniMomentumVerdict(): { verdict: string; nextAction: string } {
  return {
    verdict: `Alumni Momentum keeps your trajectory archive readable and grants ${MOMENTUM_ALUMNI_CREDITS_PER_QUARTER} included Guide session per quarter at ${formatStudentMomentumAlumniAnnualPrice()}.`,
    nextAction: "Subscribe to Alumni Momentum when you want archive access without full exam-season coaching density.",
  };
}

export function quarterlyCreditExpiryMs(periodMonth: string): number {
  const start = new Date(`${periodMonth}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  const quarter = Math.floor(start.getUTCMonth() / 3);
  return Date.UTC(start.getUTCFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
}

export function buildAlumniCreditReceiptLine(input: {
  creditsRemaining: number;
  quarterLabel: string;
}): string {
  return `Alumni credit: ${input.creditsRemaining} of ${MOMENTUM_ALUMNI_CREDITS_PER_QUARTER} remaining for ${input.quarterLabel}.`;
}

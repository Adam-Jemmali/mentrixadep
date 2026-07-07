import { monthlyCreditExpiryMs } from "@/features/entitlements/pack-sprint-pure";

/** First day of the UTC calendar month, ISO date (YYYY-MM-DD). */
export function utcPeriodMonthKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export type MomentumSessionCreditGrantSource =
  | "subscription_checkout"
  | "subscription_invoice"
  | "monthly_grant"
  | "sla_makegood"
  | "alumni_quarterly"
  | "comp_member";

export function momentumCreditRedemptionKey(userId: string, availabilityId: string): string {
  return `redeem:${userId}:${availabilityId}`;
}

export type MonthlySessionCreditRowLike = {
  id: string;
  period_month: string;
  credits_remaining: number;
};

export function summarizeMonthlySessionCredits(rows: MonthlySessionCreditRowLike[]): {
  totalRemaining: number;
  representative: MonthlySessionCreditRowLike | null;
} {
  const withRemaining = rows.filter((row) => (row.credits_remaining ?? 0) > 0);
  const totalRemaining = withRemaining.reduce((sum, row) => sum + (row.credits_remaining ?? 0), 0);
  if (totalRemaining <= 0) {
    return { totalRemaining: 0, representative: null };
  }

  const representative = [...withRemaining].sort(
    (a, b) => monthlyCreditExpiryMs(a.period_month) - monthlyCreditExpiryMs(b.period_month),
  )[0];

  return { totalRemaining, representative: representative ?? null };
}

export function pickMonthlySessionCreditForConsume(
  rows: MonthlySessionCreditRowLike[],
): MonthlySessionCreditRowLike | null {
  return summarizeMonthlySessionCredits(rows).representative;
}

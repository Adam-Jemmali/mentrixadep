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
  | "alumni_quarterly";

export function momentumCreditRedemptionKey(userId: string, availabilityId: string): string {
  return `redeem:${userId}:${availabilityId}`;
}

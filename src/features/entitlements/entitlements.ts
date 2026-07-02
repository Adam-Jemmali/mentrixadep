import { buildStudentEntitlements, type StudentEntitlements } from "@/features/entitlements/entitlements-pure";
import { getMomentumSessionCreditsSummary } from "@/features/entitlements/session-credits";
import { getStudentSubscription } from "@/features/payments/student-subscription";

export type { StudentEntitlements, StudentEntitlementId } from "@/features/entitlements/entitlements-pure";
export { hasEntitlement, buildStudentEntitlements } from "@/features/entitlements/entitlements-pure";

export async function getStudentEntitlements(userId: string): Promise<StudentEntitlements> {
  const [subscription, credits] = await Promise.all([
    getStudentSubscription(userId),
    getMomentumSessionCreditsSummary(userId),
  ]);

  return buildStudentEntitlements({
    userId,
    subscription,
    sessionCreditsRemaining: credits.totalRemaining,
    sessionCreditPeriodMonth: credits.monthlyCredit?.period_month ?? null,
    packSprint: credits.packSprint,
    monthlyCreditsRemaining: credits.monthlyRemaining,
  });
}

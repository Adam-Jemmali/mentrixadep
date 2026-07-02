import { buildStudentEntitlements, type StudentEntitlements } from "@/features/entitlements/entitlements-pure";
import { getCurrentMomentumSessionCredit } from "@/features/entitlements/session-credits";
import { getStudentSubscription } from "@/features/payments/student-subscription";

export type { StudentEntitlements, StudentEntitlementId } from "@/features/entitlements/entitlements-pure";
export { hasEntitlement, buildStudentEntitlements } from "@/features/entitlements/entitlements-pure";

export async function getStudentEntitlements(userId: string): Promise<StudentEntitlements> {
  const [subscription, credit] = await Promise.all([
    getStudentSubscription(userId),
    getCurrentMomentumSessionCredit(userId),
  ]);

  return buildStudentEntitlements({
    userId,
    subscription,
    sessionCreditsRemaining: credit?.credits_remaining ?? 0,
    sessionCreditPeriodMonth: credit?.period_month ?? null,
  });
}

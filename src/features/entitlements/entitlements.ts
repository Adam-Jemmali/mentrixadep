import { buildStudentEntitlements, type StudentEntitlements } from "@/features/entitlements/entitlements-pure";
import { resolveMomentumCompMember } from "@/features/entitlements/momentum-comp-members";
import { getMomentumSessionCreditsSummary, grantMomentumMonthlySessionCredit } from "@/features/entitlements/session-credits";
import { getStudentSubscription, isMomentumSubscriptionActive } from "@/features/payments/student-subscription";

export type { StudentEntitlements, StudentEntitlementId } from "@/features/entitlements/entitlements-pure";
export { hasEntitlement, buildStudentEntitlements } from "@/features/entitlements/entitlements-pure";

export async function getStudentEntitlements(userId: string): Promise<StudentEntitlements> {
  const [compMember, subscription] = await Promise.all([
    resolveMomentumCompMember(userId),
    getStudentSubscription(userId),
  ]);

  if (compMember && !isMomentumSubscriptionActive(subscription)) {
    try {
      await grantMomentumMonthlySessionCredit({
        userId,
        grantSource: "comp_member",
      });
    } catch (error) {
      console.warn("[entitlements] comp monthly credit grant failed:", error);
    }
  }

  const credits = await getMomentumSessionCreditsSummary(userId);

  return buildStudentEntitlements({
    userId,
    subscription,
    sessionCreditsRemaining: credits.totalRemaining,
    sessionCreditPeriodMonth: credits.monthlyCredit?.period_month ?? null,
    packSprint: credits.packSprint,
    monthlyCreditsRemaining: credits.monthlyRemaining,
    momentumCompMember: compMember,
  });
}

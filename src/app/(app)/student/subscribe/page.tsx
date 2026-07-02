import { Suspense } from "react";
import { requireRole } from "@/shared/core/auth";
import { getStudentSubscription } from "@/features/payments/student-subscription";
import { getStudentEntitlements } from "@/features/entitlements/entitlements";
import { loadActiveStudentGoalForViewer } from "@/features/student-goals/load-student-goal";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { daysUntilDate } from "@/features/goal-dashboard/goal-dashboard-pure";
import { SubscribeCheckoutSkeleton } from "@/shared/ui/skeleton-patterns";
import { MomentumSubscribeClient } from "./momentum-subscribe-client";

export default async function StudentSubscribePage() {
  const user = await requireRole(["student", "admin"]);
  const [initialSubscription, entitlements, activeGoal] = await Promise.all([
    getStudentSubscription(user.id),
    getStudentEntitlements(user.id),
    loadActiveStudentGoalForViewer(AP_CALC_AB_SUBJECT).catch(() => null),
  ]);
  const daysUntilExam =
    activeGoal?.targetDate != null ? daysUntilDate(activeGoal.targetDate) : null;

  return (
    <Suspense fallback={<SubscribeCheckoutSkeleton />}>
      <MomentumSubscribeClient
        initialSubscription={initialSubscription}
        sessionCreditsRemaining={entitlements.sessionCreditsRemaining}
        sessionCreditPeriodMonth={entitlements.sessionCreditPeriodMonth}
        momentumActive={entitlements.momentumActive}
        packSprint={entitlements.packSprint}
        monthlyCreditsRemaining={entitlements.monthlyCreditsRemaining}
        daysUntilExam={daysUntilExam}
      />
    </Suspense>
  );
}

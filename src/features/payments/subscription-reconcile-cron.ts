import { reconcileStudentSubscriptions } from "@/features/payments/subscription-webhook-handlers";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runReconcileSubscriptionsCron() {
  const result = await reconcileStudentSubscriptions();
  return {
    rows_checked: result.checked,
    rows_failed: result.mismatches,
    ...result,
  };
}

export const GET = cronGetHandler("reconcile-subscriptions", runReconcileSubscriptionsCron);

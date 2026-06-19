import { processQueuedPayouts } from "@/features/payments/payout-ledger";
import { runAccuracyGuaranteeChecks } from "@/features/payments/accuracy-guarantee";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runProcessPayoutsCron() {
  const guarantee = await runAccuracyGuaranteeChecks();
  const result = await processQueuedPayouts();
  return {
    rows_updated: result.processed ?? 0,
    rows_failed: result.failed ?? 0,
    guarantee_checked: guarantee.checked,
    guarantee_refunded: guarantee.refunded,
    ...result,
  };
}

export const GET = cronGetHandler("process-payouts", runProcessPayoutsCron);

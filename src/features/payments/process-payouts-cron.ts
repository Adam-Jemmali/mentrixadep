import { processQueuedPayouts } from "@/features/payments/payout-ledger";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runProcessPayoutsCron() {
  const result = await processQueuedPayouts();
  return {
    rows_updated: result.processed ?? 0,
    rows_failed: result.failed ?? 0,
    ...result,
  };
}

export const GET = cronGetHandler("process-payouts", runProcessPayoutsCron);

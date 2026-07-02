import { grantAlumniCreditsForActiveSubscribers } from "@/features/entitlements/session-credits";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runGrantAlumniQuarterCreditsCron() {
  const result = await grantAlumniCreditsForActiveSubscribers();
  return {
    rows_checked: result.checked,
    rows_granted: result.granted,
    ...result,
  };
}

export const GET = cronGetHandler("grant-alumni-quarter-credits", runGrantAlumniQuarterCreditsCron);

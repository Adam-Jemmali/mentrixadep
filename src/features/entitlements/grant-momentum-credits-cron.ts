import { grantMonthlyCreditsForActiveMomentumSubscribers } from "@/features/entitlements/session-credits";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runGrantMomentumSessionCreditsCron() {
  const result = await grantMonthlyCreditsForActiveMomentumSubscribers();
  return {
    rows_checked: result.checked,
    rows_granted: result.granted,
    ...result,
  };
}

export const GET = cronGetHandler(
  "grant-momentum-session-credits",
  runGrantMomentumSessionCreditsCron,
);

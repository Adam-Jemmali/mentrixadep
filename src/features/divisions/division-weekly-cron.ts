import { processDivisionWeeklyAwards } from "@/features/divisions/division-weekly";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runDivisionWeeklyCron() {
  const result = await processDivisionWeeklyAwards();
  return {
    rows_updated: result.winnersInserted ?? 0,
    rows_failed: result.errors.length,
    ...result,
  };
}

export const GET = cronGetHandler("division-weekly", runDivisionWeeklyCron);

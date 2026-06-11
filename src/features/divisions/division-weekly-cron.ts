import { processDivisionWeeklyAwards } from "@/features/divisions/division-weekly";
import { processDivisionWarMatchmaking } from "@/features/division-wars/matchmaking";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runDivisionWeeklyCron() {
  const result = await processDivisionWeeklyAwards();
  const warStart = await processDivisionWarMatchmaking();
  return {
    rows_updated: (result.winnersInserted ?? 0) + warStart.warsCreated,
    rows_failed: result.errors.length + warStart.errors.length,
    ...result,
    divisionWarMatchmaking: warStart,
  };
}

export const GET = cronGetHandler("division-weekly", runDivisionWeeklyCron);

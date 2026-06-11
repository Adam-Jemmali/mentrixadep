import { processDivisionWarMatchmaking } from "@/features/division-wars/matchmaking";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runDivisionWarMatchmakingCron() {
  const result = await processDivisionWarMatchmaking();
  return {
    rows_updated: result.warsCreated,
    rows_failed: result.errors.length,
    ...result,
  };
}

export const GET = cronGetHandler("division-war-matchmaking", runDivisionWarMatchmakingCron);

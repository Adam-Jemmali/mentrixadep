import { processDivisionWarResolution } from "@/features/division-wars/resolve";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runDivisionWarResolveCron() {
  const result = await processDivisionWarResolution();
  return {
    rows_updated: result.warsResolved,
    rows_failed: result.errors.length,
    ...result,
  };
}

export const GET = cronGetHandler("division-war-resolve", runDivisionWarResolveCron);

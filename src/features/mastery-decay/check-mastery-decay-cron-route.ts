import { cronGetHandler } from "@/shared/core/cron-auth";
import { runCheckMasteryDecay } from "@/features/mastery-decay/check-mastery-decay-cron";

async function runCheckMasteryDecayCron() {
  const result = await runCheckMasteryDecay();
  return {
    rows_scanned: result.scanned,
    rows_upserted: result.upserted,
    rows_pushed: result.pushed,
    rows_skipped: result.skipped,
    ...result,
  };
}

export const GET = cronGetHandler("check-mastery-decay", runCheckMasteryDecayCron);

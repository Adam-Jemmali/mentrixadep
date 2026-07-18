import { cronGetHandler } from "@/shared/core/cron-auth";
import { runGenerateWrapped } from "@/features/wrapped/generate-wrapped-cron";

async function runGenerateWrappedCron() {
  const result = await runGenerateWrapped();
  return {
    rows_scanned: result.scanned,
    rows_upserted: result.written,
    rows_skipped: result.skipped,
    push_sent: result.pushed,
    ...result,
  };
}

export const GET = cronGetHandler("generate-wrapped", runGenerateWrappedCron);

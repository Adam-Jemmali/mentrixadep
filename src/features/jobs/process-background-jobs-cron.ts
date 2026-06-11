import { processBackgroundJobs } from "@/features/jobs/process";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runProcessBackgroundJobsCron() {
  const worker = await processBackgroundJobs(50);
  return {
    rows_scanned: worker.claimed,
    rows_updated: worker.completed,
    rows_failed: worker.failed,
    ...worker,
  };
}

export const GET = cronGetHandler("process-background-jobs", runProcessBackgroundJobsCron);

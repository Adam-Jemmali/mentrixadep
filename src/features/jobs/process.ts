import {
  claimBackgroundJobs,
  markJobCompleted,
  markJobRetryOrFailed,
} from "@/features/jobs/claim";
import { runJobHandler } from "@/features/jobs/handlers";
import type { ProcessJobsResult } from "@/features/jobs/types";
import * as Sentry from "@sentry/nextjs";

export async function processBackgroundJobs(limit = 10): Promise<ProcessJobsResult> {
  const workerTag = `worker-${process.pid}-${Date.now()}`;
  const jobs = await claimBackgroundJobs(limit, workerTag);

  let completed = 0;
  let retried = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await runJobHandler(job);
      await markJobCompleted(job.id);
      completed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const outcome = await markJobRetryOrFailed(job, message);
      if (outcome === "failed") {
        failed++;
        Sentry.captureMessage(`background_job_failed: ${job.job_type}`, {
          level: "warning",
          extra: {
            jobType: job.job_type,
            idempotencyKey: job.idempotency_key,
            error: message,
          },
        });
      } else {
        retried++;
      }
    }
  }

  return {
    claimed: jobs.length,
    completed,
    retried,
    failed,
  };
}

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { BackgroundJobType } from "@/features/jobs/types";

export type EnqueueJobOptions = {
  jobType: BackgroundJobType;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  priority?: number;
  maxAttempts?: number;
  notBefore?: Date;
};

export type EnqueueJobResult = "queued" | "exists" | "failed";

export async function enqueueJob(options: EnqueueJobOptions): Promise<EnqueueJobResult> {
  const admin = createAdminClient();
  const { error } = await admin.from("background_jobs").insert({
    job_type: options.jobType,
    idempotency_key: options.idempotencyKey.slice(0, 500),
    payload: options.payload,
    status: "queued",
    priority: options.priority ?? 0,
    max_attempts: options.maxAttempts ?? 5,
    not_before: (options.notBefore ?? new Date()).toISOString(),
  });

  if (!error) return "queued";
  if (error.code === "23505") return "exists";
  console.error("[jobs] enqueue failed:", error.message);
  return "failed";
}

export async function enqueueJobs(
  jobs: EnqueueJobOptions[],
): Promise<{ queued: number; existing: number; failed: number }> {
  let queued = 0;
  let existing = 0;
  let failed = 0;
  for (const job of jobs) {
    const result = await enqueueJob(job);
    if (result === "queued") queued++;
    else if (result === "exists") existing++;
    else failed++;
  }
  return { queued, existing, failed };
}

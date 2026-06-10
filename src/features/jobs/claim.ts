import { createAdminClient } from "@/shared/integrations/supabase/admin";
import type { BackgroundJobRow } from "@/features/jobs/types";

export async function claimBackgroundJobs(
  limit: number,
  workerTag: string,
): Promise<BackgroundJobRow[]> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const claimed: BackgroundJobRow[] = [];

  const { data: candidates } = await admin
    .from("background_jobs")
    .select("*")
    .in("status", ["queued", "retry"])
    .lte("not_before", nowIso)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(Math.min(limit * 3, 30));

  for (const candidate of candidates ?? []) {
    if (claimed.length >= limit) break;

    const { data: locked } = await admin
      .from("background_jobs")
      .update({
        status: "processing",
        locked_at: nowIso,
        locked_by: workerTag,
        attempt_count: (candidate.attempt_count ?? 0) + 1,
      })
      .eq("id", candidate.id)
      .in("status", ["queued", "retry"])
      .select("*")
      .maybeSingle();

    if (locked) {
      claimed.push(locked as BackgroundJobRow);
    }
  }

  return claimed;
}

export async function markJobCompleted(jobId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("background_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: null,
    })
    .eq("id", jobId);
}

export async function markJobRetryOrFailed(
  job: BackgroundJobRow,
  errorMessage: string,
): Promise<"retry" | "failed"> {
  const admin = createAdminClient();
  const attempts = job.attempt_count ?? 1;
  const maxAttempts = job.max_attempts ?? 5;
  const shouldFail = attempts >= maxAttempts;
  const backoffMinutes = Math.min(30, Math.max(2, 2 ** (attempts - 1)));
  const notBefore = new Date(Date.now() + backoffMinutes * 60_000).toISOString();

  await admin
    .from("background_jobs")
    .update({
      status: shouldFail ? "failed" : "retry",
      not_before: shouldFail ? new Date().toISOString() : notBefore,
      locked_at: null,
      locked_by: null,
      last_error: errorMessage.slice(0, 1000),
      completed_at: shouldFail ? new Date().toISOString() : null,
    })
    .eq("id", job.id);

  return shouldFail ? "failed" : "retry";
}

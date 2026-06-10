import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { processPendingSessionXpAwards } from "@/features/xp/xp-awards";
import { enqueueRecordingTranscriptionJobsForSessions } from "@/features/studio-ai/transcription-jobs";
import { enqueueJobs } from "@/features/jobs/enqueue";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runCompleteSessionsCron() {
  const supabase = createAdminClient();

  const now = new Date().toISOString();
  const { data: sessionsToComplete } = await supabase
    .from("sessions")
    .select("id")
    .eq("status", "scheduled")
    .lte("end_time", now)
    .is("payout_status", null);

  const { error } = await supabase.rpc("auto_complete_sessions");

  if (error) {
    throw new Error(`Failed to complete sessions: ${error.message}`);
  }

  const sessionIds = (sessionsToComplete ?? []).map((s) => s.id);

  const payoutJobs = sessionIds.map((sid) => ({
    jobType: "payout.ledger" as const,
    idempotencyKey: `payout:${sid}`,
    payload: { sessionId: sid },
    priority: 2,
  }));

  const studioJobs = sessionIds.map((sid) => ({
    jobType: "ai.studio_package" as const,
    idempotencyKey: `studio:${sid}`,
    payload: { sessionId: sid },
    priority: 1,
  }));

  const transcriptionEnqueue = await enqueueRecordingTranscriptionJobsForSessions(sessionIds);

  const transcriptionJobs = sessionIds.map((sid) => ({
    jobType: "ai.transcription" as const,
    idempotencyKey: `transcription-worker:${sid}`,
    payload: { sessionId: sid },
    priority: 0,
  }));

  const [payoutResult, studioResult, transcriptionWorkerResult] = await Promise.all([
    enqueueJobs(payoutJobs),
    enqueueJobs(studioJobs),
    enqueueJobs(transcriptionJobs),
  ]);

  const xpResult = await processPendingSessionXpAwards();

  return {
    rows_scanned: sessionIds.length,
    rows_updated: sessionIds.length,
    rows_created: sessionIds.length,
    xpAwards: xpResult,
    payoutJobsQueued: payoutResult.queued,
    studioJobsQueued: studioResult.queued,
    transcriptionJobsQueued: transcriptionEnqueue.queued,
    transcriptionJobsExisting: transcriptionEnqueue.existing,
    transcriptionJobsEnqueueFailed: transcriptionEnqueue.failed,
    transcriptionWorkerJobsQueued: transcriptionWorkerResult.queued,
  };
}

export const GET = cronGetHandler("complete-sessions", runCompleteSessionsCron);

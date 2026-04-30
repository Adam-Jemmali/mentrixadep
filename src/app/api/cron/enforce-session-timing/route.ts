import { createAdminClient } from "@/lib/supabase/admin";
import { createPayoutLedgerForSession } from "@/app/actions/stripe-connect";
import {
  autoGenerateStudioPackagesForCompletedSessions,
  enqueueRecordingTranscriptionJobsForSessions,
  processPendingRecordingTranscriptionJobs,
} from "@/app/actions/autoPilot";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) return auth.response;

  return runCronJob("enforce-session-timing", async () => {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: sessionsToComplete } = await supabase
      .from("sessions")
      .select("id")
      .eq("status", "scheduled")
      .lte("end_time", now)
      .limit(200);

    const sessionIds = (sessionsToComplete ?? []).map((s) => s.id);

    if (sessionIds.length > 0) {
      await supabase
        .from("sessions")
        .update({ status: "completed", completed: true })
        .in("id", sessionIds)
        .eq("status", "scheduled");
    }

    const payoutResults = await Promise.allSettled(
      sessionIds.map((sid) => createPayoutLedgerForSession(sid)),
    );
    const payoutFailures = payoutResults.filter((r) => r.status === "rejected").length;

    const transcriptionEnqueue = await enqueueRecordingTranscriptionJobsForSessions(sessionIds);
    const transcriptionWorker = await processPendingRecordingTranscriptionJobs(1);
    const studioResult = await autoGenerateStudioPackagesForCompletedSessions(sessionIds);

    return {
      rows_scanned: sessionIds.length,
      rows_updated: sessionIds.length,
      rows_created: sessionIds.length,
      rows_failed: payoutFailures,
      payoutLedgerCreated: sessionIds.length,
      transcriptionJobsQueued: transcriptionEnqueue.queued,
      transcriptionJobsExisting: transcriptionEnqueue.existing,
      transcriptionJobsEnqueueFailed: transcriptionEnqueue.failed,
      transcriptionJobsClaimed: transcriptionWorker.claimed,
      transcriptionJobsCompleted: transcriptionWorker.completed,
      transcriptionJobsRetried: transcriptionWorker.retried,
      transcriptionJobsFailed: transcriptionWorker.failed,
      studioPackagesGenerated: studioResult.generated,
      studioPackagesSkipped: studioResult.skipped,
      studioPackagesFailed: studioResult.failed,
    };
  });
}

import { createAdminClient } from "@/lib/supabase/admin";
import { processPendingSessionXpAwards } from "@/app/actions/xp";
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

  return runCronJob("complete-sessions", async () => {
    const supabase = createAdminClient();

    // Find sessions about to be completed (for ledger creation before status update)
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
    const payoutResults = await Promise.allSettled(
      sessionIds.map((sid) => createPayoutLedgerForSession(sid))
    );
    const payoutFailures = payoutResults.filter((r) => r.status === "rejected").length;

    const transcriptionEnqueue = await enqueueRecordingTranscriptionJobsForSessions(sessionIds);
    const transcriptionWorker = await processPendingRecordingTranscriptionJobs(1);
    const studioResult = await autoGenerateStudioPackagesForCompletedSessions(sessionIds);

    const xpResult = await processPendingSessionXpAwards();

    return {
      rows_scanned: sessionIds.length,
      rows_updated: sessionIds.length,
      rows_created: sessionIds.length,
      rows_failed: payoutFailures,
      xpAwards: xpResult,
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


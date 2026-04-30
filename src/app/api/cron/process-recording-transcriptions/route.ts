import {
  processPendingRecordingTranscriptionJobs,
} from "@/app/actions/autoPilot";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) return auth.response;

  return runCronJob("process-recording-transcriptions", async () => {
    const result = await processPendingRecordingTranscriptionJobs(1);
    return {
      rows_scanned: result.claimed,
      rows_updated: result.completed,
      rows_created: 0,
      rows_failed: result.failed,
      transcriptionJobsClaimed: result.claimed,
      transcriptionJobsCompleted: result.completed,
      transcriptionJobsRetried: result.retried,
      transcriptionJobsFailed: result.failed,
    };
  });
}

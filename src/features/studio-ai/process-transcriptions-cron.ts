import { processPendingRecordingTranscriptionJobs } from "@/features/studio-ai/transcription-jobs";
import { processBackgroundJobs } from "@/features/jobs/process";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runProcessRecordingTranscriptionsCron() {
  const [worker, transcription] = await Promise.all([
    processBackgroundJobs(10),
    processPendingRecordingTranscriptionJobs(5),
  ]);

  return {
    rows_scanned: worker.claimed + transcription.claimed,
    rows_updated: worker.completed + transcription.completed,
    rows_failed: worker.failed + transcription.failed,
    backgroundJobs: worker,
    transcriptionJobs: transcription,
  };
}

export const GET = cronGetHandler("process-recording-transcriptions", runProcessRecordingTranscriptionsCron);

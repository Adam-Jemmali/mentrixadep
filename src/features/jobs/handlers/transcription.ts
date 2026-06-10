import { processPendingRecordingTranscriptionJobs } from "@/features/studio-ai/transcription-jobs";

/** Process one transcription job from the legacy table per background job tick. */
export async function handleTranscriptionJob(): Promise<void> {
  const result = await processPendingRecordingTranscriptionJobs(1);
  if (result.claimed === 0) {
    return;
  }
  if (result.failed > 0 && result.completed === 0) {
    throw new Error("Transcription job failed");
  }
}

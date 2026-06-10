import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { GoogleGenAI, type File as GeminiFile } from "@google/genai";

export const INLINE_TRANSCRIBE_MAX_BYTES = 12 * 1024 * 1024;
export const OFFLOAD_TRANSCRIBE_MAX_BYTES = 120 * 1024 * 1024;

type RecordingForTranscription = {
  id: string;
  session_id: string;
  tutor_id: string;
  storage_path: string;
  mime_type: string;
  file_size: number | null;
};

export async function ensureRecordingTranscriptionJob(
  adminClient: ReturnType<typeof createAdminClient>,
  recording: RecordingForTranscription,
): Promise<"queued" | "exists" | "failed"> {
  try {
    if (!recording.storage_path || !recording.mime_type) return "failed";
    if ((recording.file_size ?? 0) <= INLINE_TRANSCRIBE_MAX_BYTES) return "exists";

    const { data: existing } = await adminClient
      .from("session_recording_transcription_jobs")
      .select("id")
      .eq("recording_id", recording.id)
      .maybeSingle();

    if (existing) return "exists";

    const { error } = await adminClient
      .from("session_recording_transcription_jobs")
      .insert({
        session_id: recording.session_id,
        recording_id: recording.id,
        tutor_id: recording.tutor_id,
        storage_path: recording.storage_path,
        mime_type: recording.mime_type,
        file_size: recording.file_size,
        status: "queued",
        not_before: new Date().toISOString(),
      });

    if (error) return "failed";
    return "queued";
  } catch {
    return "failed";
  }
}

type RecordingTranscriptionJobRow = {
  id: string;
  session_id: string;
  recording_id: string;
  tutor_id: string;
  storage_path: string;
  mime_type: string;
  file_size: number | null;
  status: "queued" | "retry" | "processing" | "completed" | "failed";
  attempt_count: number;
  max_attempts: number;
};

export async function claimNextRecordingTranscriptionJob(
  adminClient: ReturnType<typeof createAdminClient>,
  workerTag: string,
): Promise<RecordingTranscriptionJobRow | null> {
  const nowIso = new Date().toISOString();

  const { data: candidates } = await adminClient
    .from("session_recording_transcription_jobs")
    .select("id, session_id, recording_id, tutor_id, storage_path, mime_type, file_size, status, attempt_count, max_attempts")
    .in("status", ["queued", "retry"])
    .lte("not_before", nowIso)
    .order("created_at", { ascending: true })
    .limit(5);

  for (const candidate of candidates ?? []) {
    const { data: locked } = await adminClient
      .from("session_recording_transcription_jobs")
      .update({
        status: "processing",
        locked_at: nowIso,
        locked_by: workerTag,
        attempt_count: (candidate.attempt_count ?? 0) + 1,
      })
      .eq("id", candidate.id)
      .in("status", ["queued", "retry"])
      .select("id, session_id, recording_id, tutor_id, storage_path, mime_type, file_size, status, attempt_count, max_attempts")
      .maybeSingle();

    if (locked) {
      return locked as RecordingTranscriptionJobRow;
    }
  }

  return null;
}

export async function waitForGeminiFileActive(
  ai: GoogleGenAI,
  file: GeminiFile,
): Promise<GeminiFile> {
  const fileName = file.name;
  if (!fileName) {
    throw new Error("Gemini upload did not return a file name.");
  }

  let current = file;
  const start = Date.now();
  const maxWaitMs = 45_000;

  while (Date.now() - start < maxWaitMs) {
    if (current.state === "ACTIVE") return current;
    if (current.state === "FAILED") {
      throw new Error(current.error?.message || "Gemini file processing failed.");
    }

    await new Promise((resolve) => setTimeout(resolve, 2_500));
    current = await ai.files.get({ name: fileName });
  }

  throw new Error("Gemini file processing timed out.");
}

export async function markRecordingTranscriptionJobRetry(
  adminClient: ReturnType<typeof createAdminClient>,
  job: RecordingTranscriptionJobRow,
  errorMessage: string,
): Promise<void> {
  const attempts = job.attempt_count ?? 1;
  const maxAttempts = job.max_attempts ?? 4;
  const shouldFail = attempts >= maxAttempts;
  const backoffMinutes = Math.min(30, Math.max(2, 2 ** (attempts - 1)));
  const notBefore = new Date(Date.now() + backoffMinutes * 60_000).toISOString();

  await adminClient
    .from("session_recording_transcription_jobs")
    .update({
      status: shouldFail ? "failed" : "retry",
      not_before: shouldFail ? new Date().toISOString() : notBefore,
      locked_at: null,
      locked_by: null,
      last_error: errorMessage.slice(0, 1000),
      completed_at: shouldFail ? new Date().toISOString() : null,
    })
    .eq("id", job.id);
}


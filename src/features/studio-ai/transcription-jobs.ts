/**
 * Internal recording transcription workers — server-only imports (cron / background_jobs).
 * Not a server action module; never import from client components.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { validateUUID } from "@/shared/core/security";
import { z } from "zod";
import {
  analyzeRecordingForStudioContextFromFile,
} from "@/shared/integrations/ai";
import { getGeminiApiKey } from "@/shared/core/env";
import { GoogleGenAI } from "@google/genai";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  INLINE_TRANSCRIBE_MAX_BYTES,
  OFFLOAD_TRANSCRIBE_MAX_BYTES,
  claimNextRecordingTranscriptionJob,
  ensureRecordingTranscriptionJob,
  markRecordingTranscriptionJobRetry,
  waitForGeminiFileActive,
} from "@/features/studio-ai/transcription-internal";

/** Internal only — claims and processes queued transcription jobs. */
export async function processPendingRecordingTranscriptionJobs(
  limit: number = 1,
): Promise<{ claimed: number; completed: number; retried: number; failed: number }> {
  try {
    // Validate input
    z.number().int().min(1).max(50).parse(limit);
  const adminClient = createAdminClient();
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const workerTag = `cron-${process.pid}-${Date.now()}`;

  let claimed = 0;
  let completed = 0;
  let retried = 0;
  let failed = 0;

  for (let i = 0; i < Math.max(1, limit); i++) {
    const job = await claimNextRecordingTranscriptionJob(adminClient, workerTag);
    if (!job) break;
    claimed += 1;

    let tempDir: string | null = null;
    let tempFilePath: string | null = null;

    try {
      const fileSize = job.file_size ?? 0;
      if (fileSize <= 0 || fileSize > OFFLOAD_TRANSCRIBE_MAX_BYTES) {
        throw new Error(
          fileSize > OFFLOAD_TRANSCRIBE_MAX_BYTES
            ? `Recording too large for offloaded transcription (${fileSize} bytes).`
            : "Recording file size is invalid.",
        );
      }

      const { data: signed, error: signedErr } = await adminClient.storage
        .from("video-recordings")
        .createSignedUrl(job.storage_path, 900);

      if (signedErr || !signed?.signedUrl) {
        throw new Error(signedErr?.message || "Failed to create recording signed URL.");
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45_000);
      const response = await fetch(signed.signedUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Failed to download recording (HTTP ${response.status}).`);
      }

      const binary = Buffer.from(await response.arrayBuffer());
      if (binary.length <= 0) {
        throw new Error("Downloaded recording is empty.");
      }

      tempDir = await mkdtemp(join(tmpdir(), "mentrixa-transcribe-"));
      tempFilePath = join(tempDir, `${job.recording_id}.bin`);
      await writeFile(tempFilePath, binary);

      const uploaded = await ai.files.upload({
        file: tempFilePath,
        config: {
          mimeType: job.mime_type,
          displayName: `session-${job.session_id}-recording`,
        },
      });

      const activeFile = await waitForGeminiFileActive(ai, uploaded);
      const fileUri = activeFile.uri;
      if (!fileUri) {
        throw new Error("Gemini file URI missing after upload.");
      }

      const { data: session } = await adminClient
        .from("sessions")
        .select("course")
        .eq("id", job.session_id)
        .maybeSingle();
      const course = session?.course ?? "Tutoring session";

      const analysis = await analyzeRecordingForStudioContextFromFile(
        {
          course,
          mimeType: job.mime_type,
          fileUri,
        },
        job.tutor_id,
      );

      if ("error" in analysis) {
        throw new Error(analysis.message || "Recording analysis failed.");
      }

      await adminClient
        .from("session_recording_transcription_jobs")
        .update({
          status: "completed",
          transcript_excerpt: analysis.transcriptExcerpt,
          screen_share_summary: analysis.screenShareSummary,
          key_topics: analysis.keyTopics,
          learner_questions: analysis.learnerQuestions,
          gemini_file_name: activeFile.name ?? null,
          gemini_file_uri: fileUri,
          completed_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
          last_error: null,
        })
        .eq("id", job.id);

      completed += 1;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown transcription job error";
      await markRecordingTranscriptionJobRetry(adminClient, job, msg);
      if ((job.attempt_count ?? 1) >= (job.max_attempts ?? 4)) {
        failed += 1;
      } else {
        retried += 1;
      }
    } finally {
      if (tempFilePath) {
        await rm(tempFilePath, { force: true }).catch(() => undefined);
      }
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }

  return { claimed, completed, retried, failed };
  } catch (err) {
    console.error("[autoPilot] processPendingRecordingTranscriptionJobs error:", err);
    return { claimed: 0, completed: 0, retried: 0, failed: 1 };
  }
}

/** Internal only — enqueues transcription jobs for completed sessions. */
export async function enqueueRecordingTranscriptionJobsForSessions(
  sessionIds: string[],
): Promise<{ queued: number; existing: number; failed: number }> {
  try {
    // Validate input
    z.array(z.string().uuid()).parse(sessionIds);
  const adminClient = createAdminClient();
  let queued = 0;
  let existing = 0;
  let failed = 0;

  for (const rawId of sessionIds) {
    try {
      const sessionId = validateUUID(rawId);
      const { data: session } = await adminClient
        .from("sessions")
        .select("id, tutor_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (!session) {
        failed += 1;
        continue;
      }

      const { data: latestRecording } = await adminClient
        .from("video_recordings")
        .select("id, storage_path, mime_type, file_size, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        !latestRecording?.id ||
        !latestRecording.storage_path ||
        !latestRecording.mime_type ||
        (latestRecording.file_size ?? 0) <= INLINE_TRANSCRIBE_MAX_BYTES
      ) {
        existing += 1;
        continue;
      }

      const state = await ensureRecordingTranscriptionJob(adminClient, {
        id: latestRecording.id,
        session_id: sessionId,
        tutor_id: session.tutor_id,
        storage_path: latestRecording.storage_path,
        mime_type: latestRecording.mime_type,
        file_size: latestRecording.file_size ?? null,
      });

      if (state === "queued") queued += 1;
      else if (state === "exists") existing += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { queued, existing, failed };
  } catch (err) {
    console.error("[autoPilot] enqueueRecordingTranscriptionJobsForSessions error:", err);
    return { queued: 0, existing: 0, failed: sessionIds.length };
  }
}
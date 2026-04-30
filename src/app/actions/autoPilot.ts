"use server";

import { requireRole, requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateUUID } from "@/lib/security";
import { z } from "zod";
import {
  analyzeRecordingForStudioContext,
  analyzeRecordingForStudioContextFromFile,
  generateStudioSessionPackage,
} from "@/lib/ai";
import { revalidatePath } from "next/cache";
import type { SessionAiPackage } from "@/lib/database.types";
import type { NormalizedStudioPackage } from "@/lib/studio-package";
import {
  sendAiPackageReadyEmail,
  type SessionEmailDetails,
} from "@/lib/email";
import { applyXpAward } from "@/app/actions/xp";
import { XP } from "@/lib/xp-constants";
import { GoogleGenAI, type File as GeminiFile } from "@google/genai";
import { getGeminiApiKey } from "@/lib/env";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export interface TutorSessionWithPackage {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  status: string | null;
  student_email: string | null;
  /** From user_settings when available */
  student_display_name: string | null;
  student_id: string;
  aiPackage: SessionAiPackage | null;
}

/**
 * Fetch all past sessions for the current tutor, each with its AI package (if any).
 */
export async function getTutorSessionsWithPackages(onBehalfOfTutorId?: string): Promise<
  TutorSessionWithPackage[] | { error: string }
> {
  try {
    // Validate input
    if (onBehalfOfTutorId) validateUUID(onBehalfOfTutorId);
    const user = await requireRole(["tutor", "admin"]);
    const adminClient = createAdminClient();

    const targetTutorId = user.role === "admin" && onBehalfOfTutorId ? onBehalfOfTutorId : user.id;

    const nowIso = new Date().toISOString();
    const [{ data: endedRows, error: e1 }, { data: earlyRows, error: e2 }] = await Promise.all([
      adminClient
        .from("sessions")
        .select("id, course, start_time, end_time, completed, status, student_id")
        .eq("tutor_id", targetTutorId)
        .lt("end_time", nowIso),
      adminClient
        .from("sessions")
        .select("id, course, start_time, end_time, completed, status, student_id")
        .eq("tutor_id", targetTutorId)
        .in("status", ["completed", "cancelled"])
        .gte("end_time", nowIso),
    ]);

    if (e1 || e2) return { error: e1?.message || e2?.message || "Failed to load sessions" };

    const byId = new Map<string, NonNullable<typeof endedRows>[number]>();
    for (const row of [...(endedRows ?? []), ...(earlyRows ?? [])]) {
      if (row) byId.set(row.id, row);
    }
    const sessions = Array.from(byId.values()).sort(
      (a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime(),
    );

    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((s) => s.id);

    // Fetch packages for all sessions in one query
    const { data: packages } = await adminClient
      .from("session_ai_packages")
      .select("*")
      .in("session_id", sessionIds);

    const packageMap = new Map<string, SessionAiPackage>();
    for (const pkg of packages ?? []) {
      packageMap.set(pkg.session_id, pkg as SessionAiPackage);
    }

    // Fetch student emails via auth admin API
    const studentIds = Array.from(new Set(sessions.map((s) => s.student_id)));
    const emailMap: Record<string, string> = {};
    await Promise.all(
      studentIds.map(async (sid) => {
        try {
          const { data } = await adminClient.auth.admin.getUserById(sid);
          if (data?.user?.email) emailMap[sid] = data.user.email;
        } catch {
          // best-effort
        }
      })
    );

    const { data: nameRows } = await adminClient
      .from("user_settings")
      .select("user_id, display_name")
      .in("user_id", studentIds);
    const nameByStudent = new Map<string, string | null>();
    for (const row of nameRows ?? []) {
      const dn = typeof row.display_name === "string" ? row.display_name.trim() : null;
      nameByStudent.set(row.user_id, dn || null);
    }

    return sessions.map((s) => ({
      id: s.id,
      course: s.course,
      start_time: s.start_time,
      end_time: s.end_time,
      completed: s.completed,
      status: s.status ?? null,
      student_id: s.student_id,
      student_email: emailMap[s.student_id] ?? null,
      student_display_name: nameByStudent.get(s.student_id) ?? null,
      aiPackage: packageMap.get(s.id) ?? null,
    }));
  } catch (err) {
    if (err instanceof Error) return { error: err.message };
    return { error: "Something went wrong" };
  }
}

type SessionRowForPackage = {
  id: string;
  tutor_id: string;
  course: string;
  start_time: string;
  end_time: string;
  student_id: string;
};

const INLINE_TRANSCRIBE_MAX_BYTES = 12 * 1024 * 1024;
const OFFLOAD_TRANSCRIBE_MAX_BYTES = 120 * 1024 * 1024;

type RecordingForTranscription = {
  id: string;
  session_id: string;
  tutor_id: string;
  storage_path: string;
  mime_type: string;
  file_size: number | null;
};

async function ensureRecordingTranscriptionJob(
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

async function claimNextRecordingTranscriptionJob(
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

async function waitForGeminiFileActive(
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

async function markRecordingTranscriptionJobRetry(
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

export async function buildSessionPackageRichContext(
  adminClient: ReturnType<typeof createAdminClient>,
  sessionId: string,
  session: SessionRowForPackage,
) {
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  const durationMinutes = Math.max(
    5,
    Math.round((end.getTime() - start.getTime()) / 60_000),
  );
  const sessionWhen = `${start.toISOString()} → ${end.toISOString()}`;

  const contextBlocks: string[] = [];

  const { data: recordings } = await adminClient
    .from("video_recordings")
    .select("id, duration_seconds, storage_path, file_size, mime_type, created_at")
    .eq("session_id", sessionId);

  if (recordings && recordings.length > 0) {
    const totalSec = recordings.reduce((acc, r) => acc + (r.duration_seconds ?? 0), 0);
    const mins = totalSec > 0 ? Math.round(totalSec / 60) : null;
    contextBlocks.push(
      `Video call recording(s): ${recordings.length} file(s) stored for this session.` +
        (mins != null && mins > 0
          ? ` Combined duration ~${mins} minutes. (Raw video/audio is not sent to the model—only this metadata.)`
          : " Use metadata only; transcript is not stored in Mentrixa."),
    );

    // Attempt transcript/screen-share extraction from the newest recording file.
    const latestRecording = [...recordings]
      .sort((a, b) => {
        const aTs = new Date(a.created_at ?? 0).getTime();
        const bTs = new Date(b.created_at ?? 0).getTime();
        return bTs - aTs;
      })[0];

    if (latestRecording?.storage_path && latestRecording?.mime_type && (latestRecording.file_size ?? 0) > 0) {
      const latestSize = latestRecording.file_size ?? 0;
      if (latestSize <= INLINE_TRANSCRIBE_MAX_BYTES) {
        try {
          const { data: signed } = await adminClient.storage
            .from("video-recordings")
            .createSignedUrl(latestRecording.storage_path, 300);

          if (signed?.signedUrl) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 20_000);
            const response = await fetch(signed.signedUrl, { signal: controller.signal });
            clearTimeout(timer);

            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              if (arrayBuffer.byteLength > 0 && arrayBuffer.byteLength <= INLINE_TRANSCRIBE_MAX_BYTES) {
                const base64Data = Buffer.from(arrayBuffer).toString("base64");
                const mediaInsights = await analyzeRecordingForStudioContext(
                  {
                    course: session.course,
                    mimeType: latestRecording.mime_type,
                    base64Data,
                  },
                  session.tutor_id,
                );

                if (!("error" in mediaInsights)) {
                  contextBlocks.push(
                    [
                      "Recording-derived transcript excerpt (tutor session):",
                      mediaInsights.transcriptExcerpt,
                      `Screen-share/visual summary: ${mediaInsights.screenShareSummary}`,
                      mediaInsights.keyTopics.length > 0
                        ? `Topics heard in audio: ${mediaInsights.keyTopics.join(", ")}`
                        : "Topics heard in audio: none reliably extracted.",
                      mediaInsights.learnerQuestions.length > 0
                        ? "Learner questions/misconceptions:\n" +
                          mediaInsights.learnerQuestions.map((q: string) => `- ${q}`).join("\n")
                        : "Learner questions/misconceptions: none reliably extracted.",
                    ].join("\n"),
                  );
                }
              }
            }
          }
        } catch (transcriptErr) {
          console.warn("[Studio] recording transcript extraction skipped:", transcriptErr);
        }
      } else {
        const { data: existingJob } = await adminClient
          .from("session_recording_transcription_jobs")
          .select("status, transcript_excerpt, screen_share_summary, key_topics, learner_questions")
          .eq("recording_id", latestRecording.id)
          .maybeSingle();

        if (existingJob?.status === "completed" && existingJob.transcript_excerpt) {
          const keyTopics = Array.isArray(existingJob.key_topics)
            ? existingJob.key_topics.filter((v): v is string => typeof v === "string").slice(0, 10)
            : [];
          const learnerQuestions = Array.isArray(existingJob.learner_questions)
            ? existingJob.learner_questions.filter((v): v is string => typeof v === "string").slice(0, 8)
            : [];

          contextBlocks.push(
            [
              "Recording-derived transcript excerpt (queued long-recording analysis):",
              existingJob.transcript_excerpt,
              `Screen-share/visual summary: ${existingJob.screen_share_summary ?? "No reliable screen-share summary detected."}`,
              keyTopics.length > 0
                ? `Topics heard in audio: ${keyTopics.join(", ")}`
                : "Topics heard in audio: none reliably extracted.",
              learnerQuestions.length > 0
                ? "Learner questions/misconceptions:\n" + learnerQuestions.map((q) => `- ${q}`).join("\n")
                : "Learner questions/misconceptions: none reliably extracted.",
            ].join("\n"),
          );
        } else if (existingJob?.status === "failed") {
          contextBlocks.push(
            "Long-recording transcript extraction failed after retries. Build this package from chat transcript, whiteboard activity, screen-share timeline, and prior sessions.",
          );
        } else {
          await ensureRecordingTranscriptionJob(adminClient, {
            id: latestRecording.id,
            session_id: session.id,
            tutor_id: session.tutor_id,
            storage_path: latestRecording.storage_path,
            mime_type: latestRecording.mime_type,
            file_size: latestRecording.file_size ?? null,
          });

          contextBlocks.push(
            "Recording transcript for this long session is queued for offloaded processing and may not be ready yet. Prioritize chat transcript, whiteboard activity, screen-share timeline, and prior sessions for personalization.",
          );
        }
      }
    }
  } else {
    contextBlocks.push(
      "No video recording is stored for this session. Generate the package from course, timing, learner quest history, and prior session summaries below.",
    );
  }

  const { data: priorSessions } = await adminClient
    .from("sessions")
    .select("id, course, start_time, end_time")
    .eq("student_id", session.student_id)
    .eq("tutor_id", session.tutor_id)
    .neq("id", sessionId)
    .lt("end_time", session.end_time)
    .order("end_time", { ascending: false })
    .limit(6);

  if (priorSessions && priorSessions.length > 0) {
    const priorIds = priorSessions.map((s) => s.id);
    const { data: priorPkgs } = await adminClient
      .from("session_ai_packages")
      .select("session_id, summary")
      .in("session_id", priorIds);

    const summaryBySession = new Map(
      (priorPkgs ?? []).map((p) => [p.session_id, p.summary as string | null]),
    );

    const lines: string[] = [
      "Earlier sessions with this learner (same tutor), for continuity:",
    ];
    for (const ps of priorSessions) {
      const sum = summaryBySession.get(ps.id);
      const excerpt = sum ? String(sum).replace(/\s+/g, " ").trim().slice(0, 320) : null;
      lines.push(
        `- ${ps.course} @ ${ps.start_time}: ${excerpt ?? "(no Quest package yet)"}`,
      );
    }
    contextBlocks.push(lines.join("\n"));
  }

  const { data: progressRows } = await adminClient
    .from("user_quest_progress")
    .select("quest_id, status")
    .eq("user_id", session.student_id)
    .in("status", ["in_progress", "completed"])
    .order("last_attempt_at", { ascending: false })
    .limit(25);

  if (progressRows && progressRows.length > 0) {
    const questIds = Array.from(new Set(progressRows.map((p) => p.quest_id)));
    const { data: questRows } = await adminClient
      .from("quests")
      .select("id, prompt")
      .in("id", questIds);

    const promptById = new Map((questRows ?? []).map((q) => [q.id, q.prompt as string]));

    const lines: string[] = ["Learner Mentrixa Quest activity (topics practiced):"];
    let n = 0;
    for (const pr of progressRows) {
      if (n >= 10) break;
      const prompt = promptById.get(pr.quest_id);
      if (!prompt) continue;
      lines.push(
        `- [${pr.status}] ${String(prompt).replace(/\s+/g, " ").trim().slice(0, 200)}`,
      );
      n++;
    }
    if (lines.length > 1) contextBlocks.push(lines.join("\n"));
  }

  const { data: ratingRow } = await adminClient
    .from("ratings")
    .select("rating, comment")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (ratingRow?.comment?.trim()) {
    contextBlocks.push(
      `Learner comment after this session (${ratingRow.rating}/5): ${ratingRow.comment.trim().slice(0, 600)}`,
    );
  }

  const { data: aiContextRow } = await adminClient
    .from("session_ai_context")
    .select(
      "chat_transcript, whiteboard_summary, whiteboard_snapshot_data_url, screen_share_timeline, recording_hints",
    )
    .eq("session_id", sessionId)
    .maybeSingle();

  if (aiContextRow) {
    const chatTranscript = Array.isArray(aiContextRow.chat_transcript)
      ? aiContextRow.chat_transcript
      : [];
    if (chatTranscript.length > 0) {
      const lines = chatTranscript
        .slice(-60)
        .map((entry) => {
          const author =
            typeof entry?.authorLabel === "string" && entry.authorLabel.trim().length > 0
              ? entry.authorLabel.trim()
              : "Participant";
          const text =
            typeof entry?.text === "string" ? entry.text.replace(/\s+/g, " ").trim().slice(0, 260) : "";
          return text ? `- ${author}: ${text}` : null;
        })
        .filter((line): line is string => Boolean(line));
      if (lines.length > 0) {
        contextBlocks.push(
          [
            "In-call chat transcript excerpt (chronological):",
            ...lines,
          ].join("\n"),
        );
      }
    }

    const whiteboardSummary =
      aiContextRow.whiteboard_summary && typeof aiContextRow.whiteboard_summary === "object"
        ? (aiContextRow.whiteboard_summary as {
            drawEvents?: number;
            clearEvents?: number;
            byTool?: Record<string, number>;
          })
        : null;

    if (whiteboardSummary) {
      const toolStats = whiteboardSummary.byTool
        ? Object.entries(whiteboardSummary.byTool)
            .slice(0, 8)
            .map(([tool, count]) => `${tool}: ${count}`)
            .join(", ")
        : "none";
      contextBlocks.push(
        `Whiteboard activity: draw_events=${whiteboardSummary.drawEvents ?? 0}, clear_events=${whiteboardSummary.clearEvents ?? 0}, tools={${toolStats}}.` +
          (aiContextRow.whiteboard_snapshot_data_url
            ? " A whiteboard snapshot image was captured for this session (do not hallucinate image contents; use only as optional signal)."
            : ""),
      );
    }

    const timeline = Array.isArray(aiContextRow.screen_share_timeline)
      ? aiContextRow.screen_share_timeline
      : [];
    if (timeline.length > 0) {
      const compact = timeline
        .slice(-40)
        .map((ev) => {
          const state = ev?.state === "end" ? "end" : "start";
          const at = Number.isFinite(Number(ev?.at)) ? new Date(Number(ev.at)).toISOString() : "unknown-time";
          return `${state}@${at}`;
        })
        .join(", ");
      contextBlocks.push(`Screen-sharing timeline markers (tutor POV): ${compact}.`);
    }

    if (aiContextRow.recording_hints && typeof aiContextRow.recording_hints === "object") {
      const hints = aiContextRow.recording_hints as Record<string, unknown>;
      const compactHints = Object.entries(hints)
        .slice(0, 10)
        .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join(", ");
      if (compactHints) {
        contextBlocks.push(`Recording/processing hints: ${compactHints}.`);
      }
    }
  }

  return {
    course: session.course,
    durationMinutes,
    sessionWhen,
    contextBlocks,
  };
}

function normalizedToDbRow(
  sessionId: string,
  norm: NormalizedStudioPackage,
  generatedBy: string,
  publishedAt: string | null,
  studioRegenerateCount: number,
) {
  return {
    session_id: sessionId,
    summary: norm.summary,
    key_points: norm.keyPoints,
    flashcards: norm.flashcards,
    practice_exercises: norm.practiceExercises,
    follow_up_topics: norm.followUpTopics,
    followup_quests: norm.followupQuestPrompts.map((prompt) => ({
      prompt,
      difficulty: "medium" as const,
    })),
    generated_by: generatedBy,
    package_published_at: publishedAt,
    studio_regenerate_count: studioRegenerateCount,
  };
}

async function sendStudioPackageReadyEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  validSessionId: string,
  course: string,
  inserted: SessionAiPackage,
) {
  try {
    const sessionFull = await adminClient
      .from("sessions")
      .select("student_id, start_time, end_time")
      .eq("id", validSessionId)
      .single();
    const studentId = sessionFull.data?.student_id;
    const row = inserted;
    const kp = Array.isArray(row.key_points) ? row.key_points.length : 0;
    const fc = Array.isArray(row.flashcards) ? row.flashcards.length : 0;
    const fq = Array.isArray(row.followup_quests) ? row.followup_quests.length : 0;
    const pe = Array.isArray(row.practice_exercises) ? row.practice_exercises.length : 0;
    const preview =
      typeof row.summary === "string" && row.summary.trim() ? row.summary.trim() : null;

    if (studentId && sessionFull.data) {
      const [studentAuthData, settingsRow] = await Promise.all([
        adminClient.auth.admin.getUserById(studentId),
        adminClient
          .from("user_settings")
          .select("display_name")
          .eq("user_id", studentId)
          .maybeSingle(),
      ]);
      const studentEmail = studentAuthData.data?.user?.email;
      if (studentEmail) {
        const details: SessionEmailDetails = {
          sessionId: validSessionId,
          course,
          startTime: sessionFull.data.start_time,
          endTime: sessionFull.data.end_time,
          studentDisplayName: settingsRow.data?.display_name ?? null,
          packageSummaryPreview: preview,
          keyPointsCount: kp,
          flashcardsCount: fc,
          followupQuestsCount: fq,
          practiceExercisesCount: pe,
        };
        void sendAiPackageReadyEmail(studentEmail, details);
      }
    }
  } catch (emailErr) {
    console.error("[Studio] email notification failed:", emailErr);
  }
}

/**
 * Generate AI Studio package (summary, flashcards, exercises, topics, quest prompts).
 * Learner-initiated: published immediately + email. Guide-initiated: draft until publish.
 * Idempotent: returns existing published or draft row when already present.
 */
export async function generateSessionPackage(
  sessionId: string,
  onBehalfOfTutorId?: string,
  tutorContext?: string,
): Promise<{ package: SessionAiPackage } | { error: string }> {
  try {
    const user = await requireAuth();
    const validSessionId = validateUUID(sessionId);

    const adminClient = createAdminClient();

    const { data: session, error: sessionError } = await adminClient
      .from("sessions")
      .select("id, tutor_id, course, start_time, end_time, student_id")
      .eq("id", validSessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return { error: "Session not found" };
    }

    const targetTutorId =
      user.role === "admin" && onBehalfOfTutorId ? onBehalfOfTutorId : user.id;

    // Restricted: only tutors or admins can generate/regenerate.
    // (Previously allowed students to generate their own immediately).
    if (session.tutor_id !== targetTutorId && user.role !== "admin") {
      return { error: "Unauthorized" };
    }

    const isLearnerInitiated = session.student_id === user.id;

    const { data: existing, error: existingError } = await adminClient
      .from("session_ai_packages")
      .select("*")
      .eq("session_id", validSessionId)
      .maybeSingle();

    if (existingError) {
      return { error: existingError.message };
    }

    if (existing) {
      const pub = existing.package_published_at;
      if (pub) {
        revalidatePath("/student");
        revalidatePath("/tutor");
        revalidatePath("/tutor/sessions-ai");
        return { package: existing as SessionAiPackage };
      }
      if (isLearnerInitiated) {
        return {
          error:
            "Your guide is preparing this Studio package. Check back soon or message them if you need it urgently.",
        };
      }
      revalidatePath("/student");
      revalidatePath("/tutor");
      revalidatePath("/tutor/sessions-ai");
      return { package: existing as SessionAiPackage };
    }

    const richContext = await buildSessionPackageRichContext(
      adminClient,
      validSessionId,
      session as SessionRowForPackage,
    );

    const aiResult = await generateStudioSessionPackage(
      richContext,
      tutorContext,
      user.id,
    );

    if ("error" in aiResult && aiResult.error) {
      const msg =
        typeof (aiResult as { message?: string }).message === "string"
          ? (aiResult as { message: string }).message
          : "Quest generation failed, please try again";
      return { error: msg };
    }

    const norm = aiResult as NormalizedStudioPackage;
    const publishedAt = isLearnerInitiated ? new Date().toISOString() : null;
    const rowPayload = normalizedToDbRow(
      validSessionId,
      norm,
      user.id,
      publishedAt,
      0,
    );

    const { data: inserted, error: insertError } = await adminClient
      .from("session_ai_packages")
      .insert(rowPayload)
      .select()
      .single();

    if (insertError) {
      return { error: insertError.message };
    }

    const pkg = inserted as SessionAiPackage;
    if (publishedAt) {
      void sendStudioPackageReadyEmail(adminClient, validSessionId, session.course, pkg);
    }

    revalidatePath("/student");
    revalidatePath("/tutor");
    revalidatePath("/tutor/sessions-ai");
    return { package: pkg };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Forbidden" || err.message === "Unauthorized") {
        return { error: "Unauthorized" };
      }
      if (err.message.includes("Invalid") || err.message.includes("UUID")) {
        return { error: "Invalid session ID" };
      }
      return { error: err.message };
    }
    return { error: "Something went wrong" };
  }
}

/**
 * Persist streamed or regenerated Studio output as a draft (email only after publish).
 * - insert: no row yet
 * - replace draft: unpublished row, overwrite without incrementing regenerate count
 * - regenerate: increment count (max 3)
 */
export async function persistStudioDraftFromNormalized(
  sessionId: string,
  norm: NormalizedStudioPackage,
  options: { isRegenerate: boolean; onBehalfOfTutorId?: string },
): Promise<{ package: SessionAiPackage } | { error: string }> {
  try {
    const user = await requireRole(["tutor", "admin"]);
    const validSessionId = validateUUID(sessionId);
    const adminClient = createAdminClient();

    const targetTutorId =
      user.role === "admin" && options.onBehalfOfTutorId
        ? options.onBehalfOfTutorId
        : user.id;

    const { data: session, error: sessionError } = await adminClient
      .from("sessions")
      .select("id, tutor_id, course")
      .eq("id", validSessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return { error: "Session not found" };
    }
    if (session.tutor_id !== targetTutorId) {
      return { error: "Unauthorized" };
    }

    const { data: existing, error: exErr } = await adminClient
      .from("session_ai_packages")
      .select("*")
      .eq("session_id", validSessionId)
      .maybeSingle();

    if (exErr) {
      return { error: exErr.message };
    }

    let nextRegenerateCount = existing?.studio_regenerate_count ?? 0;

    if (options.isRegenerate) {
      if (!existing) {
        return { error: "Nothing to regenerate" };
      }
      if (nextRegenerateCount >= 3) {
        return { error: "Regenerate limit reached (3 per session)." };
      }
      nextRegenerateCount += 1;
    } else if (existing?.package_published_at) {
      return { error: "A published package already exists for this session." };
    }

    const baseRow = normalizedToDbRow(
      validSessionId,
      norm,
      user.id,
      existing?.package_published_at ?? null,
      nextRegenerateCount,
    );

    if (existing) {
      const { data: updated, error: uErr } = await adminClient
        .from("session_ai_packages")
        .update({
          summary: baseRow.summary,
          key_points: baseRow.key_points,
          flashcards: baseRow.flashcards,
          practice_exercises: baseRow.practice_exercises,
          follow_up_topics: baseRow.follow_up_topics,
          followup_quests: baseRow.followup_quests,
          generated_by: user.id,
          studio_regenerate_count: nextRegenerateCount,
        })
        .eq("session_id", validSessionId)
        .select()
        .single();

      if (uErr) {
        return { error: uErr.message };
      }
      revalidatePath("/tutor/sessions-ai");
      revalidatePath("/student");
      return { package: updated as SessionAiPackage };
    }

    const { data: inserted, error: iErr } = await adminClient
      .from("session_ai_packages")
      .insert({
        ...baseRow,
        package_published_at: null,
        studio_regenerate_count: 0,
      })
      .select()
      .single();

    if (iErr) {
      return { error: iErr.message };
    }
    revalidatePath("/tutor/sessions-ai");
    revalidatePath("/student");
    return { package: inserted as SessionAiPackage };
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Something went wrong" };
  }
}

export async function saveStudioPackageDraft(
  sessionId: string,
  payload: {
    summary: string | null;
    key_points: string[] | null;
    flashcards: SessionAiPackage["flashcards"];
    practice_exercises: SessionAiPackage["practice_exercises"];
    follow_up_topics: string[] | null;
    followup_quests: SessionAiPackage["followup_quests"];
  },
  onBehalfOfTutorId?: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    const user = await requireRole(["tutor", "admin"]);
    const validSessionId = validateUUID(sessionId);
    const adminClient = createAdminClient();
    const targetTutorId =
      user.role === "admin" && onBehalfOfTutorId ? onBehalfOfTutorId : user.id;

    const { data: session, error: sErr } = await adminClient
      .from("sessions")
      .select("tutor_id")
      .eq("id", validSessionId)
      .maybeSingle();
    if (sErr || !session) {
      return { error: "Session not found" };
    }
    if (session.tutor_id !== targetTutorId) {
      return { error: "Unauthorized" };
    }

    const { error: uErr } = await adminClient
      .from("session_ai_packages")
      .update({
        summary: payload.summary,
        key_points: payload.key_points,
        flashcards: payload.flashcards,
        practice_exercises: payload.practice_exercises,
        follow_up_topics: payload.follow_up_topics ?? [],
        followup_quests: payload.followup_quests,
      })
      .eq("session_id", validSessionId);

    if (uErr) {
      return { error: uErr.message };
    }
    revalidatePath("/tutor/sessions-ai");
    revalidatePath("/student");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Something went wrong" };
  }
}

export async function publishStudioPackage(
  sessionId: string,
  onBehalfOfTutorId?: string,
): Promise<{ package: SessionAiPackage } | { error: string }> {
  try {
    const user = await requireRole(["tutor", "admin"]);
    const validSessionId = validateUUID(sessionId);
    const adminClient = createAdminClient();
    const targetTutorId =
      user.role === "admin" && onBehalfOfTutorId ? onBehalfOfTutorId : user.id;

    const { data: session, error: sErr } = await adminClient
      .from("sessions")
      .select("id, tutor_id, course, start_time, end_time, student_id")
      .eq("id", validSessionId)
      .maybeSingle();
    if (sErr || !session) {
      return { error: "Session not found" };
    }
    if (session.tutor_id !== targetTutorId) {
      return { error: "Unauthorized" };
    }

    const { data: existing, error: pErr } = await adminClient
      .from("session_ai_packages")
      .select("*")
      .eq("session_id", validSessionId)
      .maybeSingle();
    if (pErr || !existing) {
      return { error: pErr?.message || "No Studio package to publish" };
    }
    if (existing.package_published_at) {
      return { error: "Already published" };
    }

    const now = new Date().toISOString();
    const { data: updated, error: uErr } = await adminClient
      .from("session_ai_packages")
      .update({ package_published_at: now })
      .eq("session_id", validSessionId)
      .select()
      .single();

    if (uErr) {
      return { error: uErr.message };
    }

    const pkg = updated as SessionAiPackage;
    void sendStudioPackageReadyEmail(adminClient, validSessionId, session.course, pkg);

    try {
      await applyXpAward(
        session.tutor_id,
        XP.TUTOR_AI_PACKAGE_PUBLISH,
        `tutor_ai_package:${validSessionId}`,
        null,
      );
    } catch {
      // best-effort XP
    }

    revalidatePath("/tutor/sessions-ai");
    revalidatePath("/student");
    return { package: pkg };
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message };
    }
    return { error: "Something went wrong" };
  }
}

/**
 * Get the AI package for a session. Caller must be the session's student or tutor.
 */
export async function getSessionPackage(
  sessionId: string
): Promise<{ package: SessionAiPackage | null } | { error: string }> {
  try {
    const user = await requireAuth();
    const validSessionId = validateUUID(sessionId);

    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, student_id, tutor_id")
      .eq("id", validSessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return { error: "Session not found" };
    }
    if (session.student_id !== user.id && session.tutor_id !== user.id && user.role !== "admin") {
      return { error: "Unauthorized" };
    }

    const isStudent = session.student_id === user.id;
    const isAdmin = user.role === "admin";

    let query = supabase
      .from("session_ai_packages")
      .select("*")
      .eq("session_id", validSessionId);

    // If student, only see published packages
    if (isStudent && !isAdmin) {
      query = query.not("package_published_at", "is", null);
    }

    const { data: pkg, error: pkgError } = await query.maybeSingle();

    if (pkgError) {
      return { error: pkgError.message };
    }

    return { package: (pkg as SessionAiPackage | null) ?? null };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") {
        return { error: "Unauthorized" };
      }
      if (err.message.includes("Invalid") || err.message.includes("UUID")) {
        return { error: "Invalid session ID" };
      }
      return { error: err.message };
    }
    return { error: "Something went wrong" };
  }
}

/**
 * Auto-generate published Studio packages for completed sessions that do not have one yet.
 * Intended for cron flows after sessions end.
 */
export async function autoGenerateStudioPackagesForCompletedSessions(
  sessionIds: string[],
): Promise<{ generated: number; skipped: number; failed: number }> {
  const adminClient = createAdminClient();
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const rawId of sessionIds) {
    try {
      const sessionId = validateUUID(rawId);

      const { data: existingPkg } = await adminClient
        .from("session_ai_packages")
        .select("session_id")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (existingPkg) {
        skipped += 1;
        continue;
      }

      const { data: session, error: sErr } = await adminClient
        .from("sessions")
        .select("id, tutor_id, course, start_time, end_time, student_id")
        .eq("id", sessionId)
        .eq("status", "completed")
        .maybeSingle();

      if (sErr || !session) {
        skipped += 1;
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
        latestRecording?.id &&
        latestRecording.storage_path &&
        latestRecording.mime_type &&
        (latestRecording.file_size ?? 0) > INLINE_TRANSCRIBE_MAX_BYTES
      ) {
        await ensureRecordingTranscriptionJob(adminClient, {
          id: latestRecording.id,
          session_id: sessionId,
          tutor_id: session.tutor_id,
          storage_path: latestRecording.storage_path,
          mime_type: latestRecording.mime_type,
          file_size: latestRecording.file_size ?? null,
        });

        const { data: job } = await adminClient
          .from("session_recording_transcription_jobs")
          .select("status")
          .eq("recording_id", latestRecording.id)
          .maybeSingle();

        if (job && job.status !== "completed" && job.status !== "failed") {
          skipped += 1;
          continue;
        }
      }

      const richContext = await buildSessionPackageRichContext(
        adminClient,
        sessionId,
        session as SessionRowForPackage,
      );

      const aiResult = await generateStudioSessionPackage(
        richContext,
        undefined,
        session.tutor_id,
      );

      if ("error" in aiResult && aiResult.error) {
        failed += 1;
        continue;
      }

      const norm = aiResult as NormalizedStudioPackage;
      const nowIso = new Date().toISOString();
      const rowPayload = normalizedToDbRow(
        sessionId,
        norm,
        session.tutor_id,
        nowIso,
        0,
      );

      const { data: inserted, error: iErr } = await adminClient
        .from("session_ai_packages")
        .insert(rowPayload)
        .select()
        .single();

      if (iErr || !inserted) {
        failed += 1;
        continue;
      }

      generated += 1;
      void sendStudioPackageReadyEmail(adminClient, sessionId, session.course, inserted as SessionAiPackage);
    } catch {
      failed += 1;
    }
  }

  if (generated > 0) {
    revalidatePath("/student");
    revalidatePath("/tutor");
    revalidatePath("/tutor/sessions-ai");
  }

  return { generated, skipped, failed };
}

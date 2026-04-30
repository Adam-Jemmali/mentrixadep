"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateUUID } from "@/lib/security";

export interface SessionAiChatLine {
  authorId: string;
  authorLabel: string;
  text: string;
  sentAt: number;
}

export interface SessionAiWhiteboardSummary {
  drawEvents?: number;
  clearEvents?: number;
  byTool?: Record<string, number>;
  recentEvents?: Array<{ tool: string; at: number; source: "local" | "remote" }>;
}

export interface SessionAiScreenShareEvent {
  state: "start" | "end";
  at: number;
  actorId: string;
}

export interface SaveSessionAiContextInput {
  sessionId: string;
  chatTranscript?: SessionAiChatLine[];
  whiteboardSummary?: SessionAiWhiteboardSummary | null;
  whiteboardSnapshotDataUrl?: string | null;
  screenShareTimeline?: SessionAiScreenShareEvent[];
  recordingHints?: Record<string, unknown>;
}

export async function saveSessionAiContext(
  input: SaveSessionAiContextInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireRole(["tutor", "admin"]);
    const adminClient = createAdminClient();

    const sessionId = validateUUID(input.sessionId);

    const { data: session, error: sessionError } = await adminClient
      .from("sessions")
      .select("id, tutor_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return { ok: false, error: "Session not found" };
    }

    if (user.role !== "admin" && session.tutor_id !== user.id) {
      return { ok: false, error: "Only the session tutor can save Quest context." };
    }

    const chatTranscript = (input.chatTranscript ?? [])
      .filter((m) => typeof m.text === "string" && m.text.trim().length > 0)
      .slice(-120)
      .map((m) => ({
        authorId: String(m.authorId || "").slice(0, 64),
        authorLabel: String(m.authorLabel || "Participant").slice(0, 80),
        text: String(m.text || "").trim().slice(0, 500),
        sentAt: Number.isFinite(m.sentAt) ? Math.round(m.sentAt) : Date.now(),
      }));

    const screenShareTimeline = (input.screenShareTimeline ?? [])
      .filter((e) => e && (e.state === "start" || e.state === "end"))
      .slice(-60)
      .map((e) => ({
        state: e.state,
        at: Number.isFinite(e.at) ? Math.round(e.at) : Date.now(),
        actorId: String(e.actorId || "").slice(0, 64),
      }));

    const whiteboardSummary = input.whiteboardSummary
      ? {
          drawEvents: Math.max(0, Number(input.whiteboardSummary.drawEvents ?? 0)),
          clearEvents: Math.max(0, Number(input.whiteboardSummary.clearEvents ?? 0)),
          byTool:
            input.whiteboardSummary.byTool && typeof input.whiteboardSummary.byTool === "object"
              ? Object.fromEntries(
                  Object.entries(input.whiteboardSummary.byTool).slice(0, 16).map(([k, v]) => [
                    String(k).slice(0, 24),
                    Math.max(0, Number(v ?? 0)),
                  ]),
                )
              : {},
          recentEvents: Array.isArray(input.whiteboardSummary.recentEvents)
            ? input.whiteboardSummary.recentEvents.slice(-40).map((ev) => ({
                tool: String(ev.tool || "unknown").slice(0, 24),
                at: Number.isFinite(ev.at) ? Math.round(ev.at) : Date.now(),
                source: ev.source === "remote" ? "remote" : "local",
              }))
            : [],
        }
      : null;

    const whiteboardSnapshotDataUrl =
      typeof input.whiteboardSnapshotDataUrl === "string" &&
      input.whiteboardSnapshotDataUrl.startsWith("data:image/")
        ? input.whiteboardSnapshotDataUrl.slice(0, 1_800_000)
        : null;

    const recordingHints =
      input.recordingHints && typeof input.recordingHints === "object"
        ? input.recordingHints
        : {};

    const { error: upsertError } = await adminClient
      .from("session_ai_context")
      .upsert(
        {
          session_id: sessionId,
          tutor_id: session.tutor_id,
          chat_transcript: chatTranscript,
          whiteboard_summary: whiteboardSummary ?? {},
          whiteboard_snapshot_data_url: whiteboardSnapshotDataUrl,
          screen_share_timeline: screenShareTimeline,
          recording_hints: recordingHints,
        },
        { onConflict: "session_id" },
      );

    if (upsertError) {
      return { ok: false, error: upsertError.message };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save session Quest context",
    };
  }
}

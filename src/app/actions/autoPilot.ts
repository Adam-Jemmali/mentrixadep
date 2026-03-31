"use server";

import { requireRole, requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateUUID } from "@/lib/security";
import { summarizeSession, type SessionPackageResponse } from "@/lib/ai";
import { revalidatePath } from "next/cache";
import type { SessionAiPackage } from "@/lib/database.types";
import {
  sendAiPackageReadyEmail,
  type SessionEmailDetails,
} from "@/lib/email";

export interface TutorSessionWithPackage {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  status: string | null;
  student_email: string | null;
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

    return sessions.map((s) => ({
      id: s.id,
      course: s.course,
      start_time: s.start_time,
      end_time: s.end_time,
      completed: s.completed,
      status: s.status ?? null,
      student_id: s.student_id,
      student_email: emailMap[s.student_id] ?? null,
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

async function buildSessionPackageRichContext(
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
    .select("duration_seconds, id")
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
        `- ${ps.course} @ ${ps.start_time}: ${excerpt ?? "(no AI package yet)"}`,
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

  return {
    course: session.course,
    durationMinutes,
    sessionWhen,
    contextBlocks,
  };
}

/**
 * Generate AI package for a session (summary, key points, flashcards, follow-up quests).
 * Uses session timing, video recording metadata, learner quests, prior session summaries, and rating comments when available.
 * Idempotent: returns existing package if already generated.
 */
export async function generateSessionPackage(
  sessionId: string,
  onBehalfOfTutorId?: string,
): Promise<{ package: SessionAiPackage } | { error: string }> {
  try {
    const user = await requireAuth();
    const validSessionId = validateUUID(sessionId);

    // Service-role read so past sessions always resolve for authorized tutors (RLS/user client edge cases).
    const adminClient = createAdminClient();

    const { data: session, error: sessionError } = await adminClient
      .from("sessions")
      .select("id, tutor_id, course, start_time, end_time, student_id")
      .eq("id", validSessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return { error: "Session not found" };
    }

    const isParticipant =
      session.student_id === user.id || session.tutor_id === user.id;
    const isAdmin = user.role === "admin";
    if (!isParticipant && !isAdmin) {
      return { error: "Unauthorized" };
    }
    if (isAdmin && onBehalfOfTutorId && session.tutor_id !== onBehalfOfTutorId) {
      return { error: "Unauthorized" };
    }

    const { data: existing, error: existingError } = await adminClient
      .from("session_ai_packages")
      .select("*")
      .eq("session_id", validSessionId)
      .maybeSingle();

    if (existingError) {
      return { error: existingError.message };
    }

    if (existing) {
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

    const aiResult = await summarizeSession(richContext, user.id);

    if ("error" in aiResult && aiResult.error) {
      const msg =
        typeof (aiResult as { message?: string }).message === "string"
          ? (aiResult as { message: string }).message
          : "AI generation failed, please try again";
      return { error: msg };
    }

    const pkgAi = aiResult as SessionPackageResponse;

    const followupQuests = (pkgAi.followupPrompts ?? []).map((prompt) => ({
      prompt,
      difficulty: "medium",
    }));

    const { data: inserted, error: insertError } = await adminClient
      .from("session_ai_packages")
      .insert({
        session_id: validSessionId,
        summary: pkgAi.summary ?? null,
        key_points: pkgAi.keyPoints ?? [],
        followup_quests: followupQuests,
        flashcards: pkgAi.flashcards ?? [],
        generated_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { error: insertError.message };
    }

    // Fire-and-forget: notify the student their AI package is ready
    try {
      const sessionFull = await adminClient
        .from("sessions")
        .select("student_id, start_time, end_time")
        .eq("id", validSessionId)
        .single();
      const studentId = sessionFull.data?.student_id;
      if (studentId) {
        const studentAuthData = await adminClient.auth.admin.getUserById(studentId);
        const studentEmail = studentAuthData.data?.user?.email;
        if (studentEmail && sessionFull.data) {
          const details: SessionEmailDetails = {
            sessionId: validSessionId,
            course: session.course,
            startTime: sessionFull.data.start_time,
            endTime: sessionFull.data.end_time,
          };
          void sendAiPackageReadyEmail(studentEmail, details);
        }
      }
    } catch (emailErr) {
      console.error("[generateSessionPackage] email notification failed:", emailErr);
    }

    revalidatePath("/student");
    revalidatePath("/tutor");
    revalidatePath("/tutor/sessions-ai");
    return { package: inserted as SessionAiPackage };
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

    const { data: pkg, error: pkgError } = await supabase
      .from("session_ai_packages")
      .select("*")
      .eq("session_id", validSessionId)
      .maybeSingle();

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

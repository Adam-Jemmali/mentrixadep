"use server";

import { requireRole, requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateUUID } from "@/lib/security";
import { generateStudioSessionPackage } from "@/lib/ai";
import { revalidatePath } from "next/cache";
import type { SessionAiPackage } from "@/lib/database.types";
import type { NormalizedStudioPackage } from "@/lib/studio-package";
import {
  sendAiPackageReadyEmail,
  type SessionEmailDetails,
} from "@/lib/email";
import { applyXpAward } from "@/app/actions/xp";
import { XP } from "@/lib/xp-constants";

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

    const isParticipant =
      session.student_id === user.id || session.tutor_id === user.id;
    const isAdmin = user.role === "admin";
    if (!isParticipant && !isAdmin) {
      return { error: "Unauthorized" };
    }
    if (isAdmin && onBehalfOfTutorId && session.tutor_id !== onBehalfOfTutorId) {
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
          : "AI generation failed, please try again";
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

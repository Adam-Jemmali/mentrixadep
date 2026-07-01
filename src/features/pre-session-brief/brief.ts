"use server";

/**
 * Pre-Session Brief — server actions.
 * Called by the /api/cron/pre-session-brief cron route and by the student hub
 * to fetch an existing brief for a session.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { requireRole } from "@/shared/core/auth";
import { sendPreSessionBriefEmail } from "@/shared/integrations/email";
import { buildDeterministicPreSessionBrief } from "@/features/pre-session-brief/build-brief";
import type { PreSessionBrief } from "@/features/pre-session-brief/brief-types";
import { mapBriefRow } from "@/features/pre-session-brief/context-mapper";

export interface StoredPreSessionBrief {
  id: string;
  sessionId: string;
  likelyCoverage: string[];
  weakSpotsToWatch: string[];
  warmUpExercise: { title: string; prompt: string; hint?: string };
  questionsToAsk: string[];
  createdAt: string;
}

/**
 * Generate, store, and email a Pre-Session Brief for a session.
 * Called by cron 2h before session start. Idempotent — skips if brief already exists.
 */
export async function generateAndStorePreSessionBrief(params: {
  sessionId: string;
  studentId: string;
  studentEmail: string;
  studentDisplayName: string | null;
  course: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  sendEmail?: boolean;
}): Promise<{ ok: true; brief: StoredPreSessionBrief } | { ok: false; reason: string }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("session_briefs")
    .select("id, created_at, likely_coverage, weak_spots, warm_up_title, warm_up_prompt, warm_up_hint, questions_to_ask")
    .eq("session_id", params.sessionId)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      brief: mapBriefRow(existing, params.sessionId),
    };
  }

  const { data: session } = await admin
    .from("sessions")
    .select("tutor_id")
    .eq("id", params.sessionId)
    .maybeSingle();

  const built = await buildDeterministicPreSessionBrief({
    studentId: params.studentId,
    guideId: session?.tutor_id ? String(session.tutor_id) : null,
    course: params.course,
  });

  if (!built.ok) {
    return { ok: false, reason: built.reason };
  }

  const brief: PreSessionBrief = built.brief;

  const { data: inserted, error: insertError } = await admin
    .from("session_briefs")
    .insert({
      session_id: params.sessionId,
      student_id: params.studentId,
      likely_coverage: brief.likelyCoverage,
      weak_spots: brief.weakSpotsToWatch,
      warm_up_title: brief.warmUpExercise.title,
      warm_up_prompt: brief.warmUpExercise.prompt,
      warm_up_hint: brief.warmUpExercise.hint ?? null,
      questions_to_ask: brief.questionsToAsk,
    })
    .select("id, created_at")
    .single();

  if (insertError || !inserted) {
    return { ok: false, reason: insertError?.message ?? "DB insert failed" };
  }

  await admin
    .from("session_briefs")
    .update({ guide_context_cached_at: null })
    .eq("session_id", params.sessionId);

  if (params.sendEmail !== false) {
    await sendPreSessionBriefEmail(params.studentEmail, {
      displayName: params.studentDisplayName,
      course: params.course,
      startTime: params.startTime,
      sessionId: params.sessionId,
      brief,
    });

    await admin
      .from("session_briefs")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", inserted.id);
  }

  const stored: StoredPreSessionBrief = {
    id: inserted.id,
    sessionId: params.sessionId,
    likelyCoverage: brief.likelyCoverage,
    weakSpotsToWatch: brief.weakSpotsToWatch,
    warmUpExercise: brief.warmUpExercise,
    questionsToAsk: brief.questionsToAsk,
    createdAt: inserted.created_at,
  };

  return { ok: true, brief: stored };
}

export async function getPreSessionBriefForSession(
  sessionId: string,
): Promise<StoredPreSessionBrief | null> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const { data } = await admin
    .from("session_briefs")
    .select(
      "id, created_at, likely_coverage, weak_spots, warm_up_title, warm_up_prompt, warm_up_hint, questions_to_ask",
    )
    .eq("session_id", sessionId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return mapBriefRow(data, sessionId);
}

export async function getUpcomingSessionBriefs(): Promise<
  Array<StoredPreSessionBrief & { sessionCourse: string; sessionStartTime: string }>
> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, course, start_time")
    .eq("student_id", user.id)
    .neq("status", "cancelled")
    .gte("start_time", new Date().toISOString())
    .lte("start_time", oneDayFromNow)
    .order("start_time", { ascending: true })
    .limit(5);

  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id as string);
  const { data: briefs } = await admin
    .from("session_briefs")
    .select(
      "id, session_id, created_at, likely_coverage, weak_spots, warm_up_title, warm_up_prompt, warm_up_hint, questions_to_ask",
    )
    .in("session_id", sessionIds);

  if (!briefs) return [];

  return briefs.map((b) => {
    const session = sessions.find((s) => s.id === b.session_id);
    return {
      ...mapBriefRow(b, b.session_id as string),
      sessionCourse: String(session?.course ?? ""),
      sessionStartTime: String(session?.start_time ?? ""),
    };
  });
}

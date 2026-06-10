"use server";

/**
 * Pre-Session Brief — server actions.
 * Called by the /api/cron/pre-session-brief cron route and by the student hub
 * to fetch an existing brief for a session.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { requireRole } from "@/shared/core/auth";
import { generatePreSessionBrief, type PreSessionBrief } from "@/shared/integrations/ai";
import { sendPreSessionBriefEmail } from "@/shared/integrations/email";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredPreSessionBrief {
  id: string;
  sessionId: string;
  likelyCoverage: string[];
  weakSpotsToWatch: string[];
  warmUpExercise: { title: string; prompt: string; hint?: string };
  questionsToAsk: string[];
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Pull the quest mistake topics for a student in a given course.
 * Uses user_quest_progress + quests metadata to find failure patterns.
 */
async function getWeakAreasForStudent(
  studentId: string,
  course: string
): Promise<string[]> {
  const admin = createAdminClient();

  // Get failed/incomplete quest attempts with metadata tags
  const { data: progress } = await admin
    .from("user_quest_progress")
    .select("quest_id, num_attempts, status")
    .eq("user_id", studentId)
    .in("status", ["in_progress", "not_started"])
    .order("num_attempts", { ascending: false })
    .limit(20);

  if (!progress || progress.length === 0) return [];

  const questIds = progress.map((p) => p.quest_id as string);

  const { data: quests } = await admin
    .from("quests")
    .select("id, prompt, metadata")
    .in("id", questIds);

  if (!quests) return [];

  // Extract topic tags from metadata or first 80 chars of prompt
  const weakAreas: string[] = [];
  for (const q of quests) {
    const meta = q.metadata as Record<string, unknown> | null;
    const tags = Array.isArray(meta?.tags)
      ? (meta!.tags as unknown[]).filter((t) => typeof t === "string").map(String)
      : [];

    if (tags.length > 0) {
      weakAreas.push(...tags.slice(0, 2));
    } else {
      // Use first 80 chars of prompt as topic hint
      const hint = String(q.prompt ?? "").slice(0, 80).trim();
      if (hint.length > 8) weakAreas.push(hint);
    }
  }

  // Filter to course-relevant (loose match) and deduplicate
  const courseLower = course.toLowerCase();
  const relevant = weakAreas.filter((w) => {
    const wl = w.toLowerCase();
    return (
      wl.includes(courseLower.split(" ")[0] ?? "") ||
      courseLower.includes(wl.slice(0, 6))
    );
  });

  // Fall back to all if no course-filtered match
  const final = relevant.length > 0 ? relevant : weakAreas;
  return [...new Set(final)].slice(0, 6);
}

/**
 * Pull recent quest topics the student has practiced (completed quests).
 */
async function getRecentQuestTopics(studentId: string): Promise<string[]> {
  const admin = createAdminClient();

  const { data: progress } = await admin
    .from("user_quest_progress")
    .select("quest_id")
    .eq("user_id", studentId)
    .eq("status", "completed")
    .order("last_attempt_at", { ascending: false })
    .limit(10);

  if (!progress || progress.length === 0) return [];

  const questIds = progress.map((p) => p.quest_id as string);
  const { data: quests } = await admin
    .from("quests")
    .select("prompt, metadata")
    .in("id", questIds);

  if (!quests) return [];

  const topics: string[] = [];
  for (const q of quests) {
    const meta = q.metadata as Record<string, unknown> | null;
    const tags = Array.isArray(meta?.tags)
      ? (meta!.tags as unknown[]).filter((t) => typeof t === "string").map(String)
      : [];
    if (tags.length > 0) {
      topics.push(tags[0]!);
    } else {
      const hint = String(q.prompt ?? "").slice(0, 60).trim();
      if (hint.length > 8) topics.push(hint);
    }
  }

  return [...new Set(topics)].slice(0, 6);
}

/**
 * Get how many confirmed sessions a student has had for a given course.
 */
async function getSessionNumberForCourse(
  studentId: string,
  course: string
): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("course", course)
    .neq("status", "cancelled");

  return (count ?? 0) + 1; // +1 = this upcoming session
}

/**
 * Get last 2 AI package summaries for the student in this course (continuity context).
 */
async function getPriorSessionSummaries(
  studentId: string,
  course: string
): Promise<string[]> {
  const admin = createAdminClient();

  // Join sessions → session_ai_packages
  const { data: sessions } = await admin
    .from("sessions")
    .select("id")
    .eq("student_id", studentId)
    .eq("course", course)
    .eq("status", "completed")
    .order("start_time", { ascending: false })
    .limit(3);

  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id as string);
  const { data: packages } = await admin
    .from("session_ai_packages")
    .select("summary")
    .in("session_id", sessionIds)
    .not("summary", "is", null)
    .limit(2);

  return (packages ?? [])
    .map((p) => String(p.summary ?? "").trim())
    .filter((s) => s.length > 10);
}

// ─── Core generation ─────────────────────────────────────────────────────────

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

  // Idempotency: skip if already generated
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

  // Gather context in parallel
  const [weakAreas, recentTopics, sessionNumber, priorSummaries] = await Promise.all([
    getWeakAreasForStudent(params.studentId, params.course),
    getRecentQuestTopics(params.studentId),
    getSessionNumberForCourse(params.studentId, params.course),
    getPriorSessionSummaries(params.studentId, params.course),
  ]);

  const result = await generatePreSessionBrief(
    {
      course: params.course,
      sessionNumber,
      durationMinutes: params.durationMinutes,
      weakAreas,
      recentQuestTopics: recentTopics,
      priorSessionSummaries: priorSummaries,
    },
    params.studentId
  );

  if ("error" in result) {
    return { ok: false, reason: result.message };
  }

  const brief = result as PreSessionBrief;

  // Persist
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

  // Send email
  if (params.sendEmail !== false) {
    await sendPreSessionBriefEmail(params.studentEmail, {
      displayName: params.studentDisplayName,
      course: params.course,
      startTime: params.startTime,
      sessionId: params.sessionId,
      brief,
    });

    // Mark email sent
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

// ─── Student-facing read ──────────────────────────────────────────────────────

/**
 * Fetch a brief for a session the current authenticated student owns.
 * Returns null if none has been generated yet.
 */
export async function getPreSessionBriefForSession(
  sessionId: string
): Promise<StoredPreSessionBrief | null> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const { data } = await admin
    .from("session_briefs")
    .select(
      "id, created_at, likely_coverage, weak_spots, warm_up_title, warm_up_prompt, warm_up_hint, questions_to_ask"
    )
    .eq("session_id", sessionId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return mapBriefRow(data, sessionId);
}

/**
 * Fetch all briefs for the current student's upcoming sessions (for hub card).
 */
export async function getUpcomingSessionBriefs(): Promise<
  Array<StoredPreSessionBrief & { sessionCourse: string; sessionStartTime: string }>
> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Get upcoming sessions in the next 24 hours
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
      "id, session_id, created_at, likely_coverage, weak_spots, warm_up_title, warm_up_prompt, warm_up_hint, questions_to_ask"
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

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapBriefRow(
  row: Record<string, unknown>,
  sessionId: string
): StoredPreSessionBrief {
  return {
    id: String(row.id ?? ""),
    sessionId,
    likelyCoverage: Array.isArray(row.likely_coverage)
      ? (row.likely_coverage as unknown[]).map(String)
      : [],
    weakSpotsToWatch: Array.isArray(row.weak_spots)
      ? (row.weak_spots as unknown[]).map(String)
      : [],
    warmUpExercise: {
      title: String(row.warm_up_title ?? "Quick warm-up"),
      prompt: String(row.warm_up_prompt ?? ""),
      hint: typeof row.warm_up_hint === "string" && row.warm_up_hint.trim()
        ? row.warm_up_hint
        : undefined,
    },
    questionsToAsk: Array.isArray(row.questions_to_ask)
      ? (row.questions_to_ask as unknown[]).map(String)
      : [],
    createdAt: String(row.created_at ?? ""),
  };
}

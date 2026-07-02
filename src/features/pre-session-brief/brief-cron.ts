import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { enqueueJobs } from "@/features/jobs/enqueue";
import { cronGetHandler } from "@/shared/core/cron-auth";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";

const BRIEF_WINDOW_MINUTES = 5;

async function loadSessionsInWindow(
  admin: ReturnType<typeof createAdminClient>,
  now: Date,
  hoursAhead: number,
) {
  const centerMs = now.getTime() + hoursAhead * 60 * 60 * 1000;
  const windowStart = new Date(centerMs - BRIEF_WINDOW_MINUTES * 60 * 1000);
  const windowEnd = new Date(centerMs + BRIEF_WINDOW_MINUTES * 60 * 1000);

  const { data, error } = await admin
    .from("sessions")
    .select("id, student_id, tutor_id, course, start_time, end_time, status")
    .neq("status", "cancelled")
    .neq("status", "completed")
    .gte("start_time", windowStart.toISOString())
    .lte("start_time", windowEnd.toISOString());

  if (error) throw new Error(`DB query failed: ${error.message}`);
  return data ?? [];
}

async function loadMomentumStudentIds(
  admin: ReturnType<typeof createAdminClient>,
  studentIds: string[],
): Promise<Set<string>> {
  if (studentIds.length === 0) return new Set();
  const { data } = await admin
    .from("student_subscriptions")
    .select("user_id, local_status")
    .in("user_id", studentIds);
  const active = new Set<string>();
  for (const row of data ?? []) {
    if (isMomentumSubscriptionActive(row as never)) {
      active.add(String(row.user_id));
    }
  }
  return active;
}

async function runPreSessionBriefCron() {
  const admin = createAdminClient();
  const now = new Date();

  const [earlySessions, standardSessions] = await Promise.all([
    loadSessionsInWindow(admin, now, 24),
    loadSessionsInWindow(admin, now, 2),
  ]);

  const sessionMap = new Map<string, (typeof earlySessions)[number]>();
  for (const session of [...earlySessions, ...standardSessions]) {
    sessionMap.set(String(session.id), session);
  }
  const sessions = [...sessionMap.values()];

  if (sessions.length === 0) {
    return { rows_scanned: 0, rows_updated: 0, briefs: 0 };
  }

  const studentIds = [...new Set(sessions.map((s) => s.student_id as string))];
  const momentumIds = await loadMomentumStudentIds(admin, studentIds);

  const [settingsResults, metaByStudent, { data: existingBriefs }] = await Promise.all([
    admin.from("user_settings").select("user_id, display_name").in("user_id", studentIds),
    getCachedUserMetaBatch(studentIds),
    admin.from("session_briefs").select("session_id").in(
      "session_id",
      sessions.map((s) => String(s.id)),
    ),
  ]);

  const briefExists = new Set((existingBriefs ?? []).map((row) => String(row.session_id)));

  const nameByStudent = Object.fromEntries(
    (settingsResults.data ?? []).map((r) => [r.user_id, r.display_name as string | null]),
  );

  const jobs: Parameters<typeof enqueueJobs>[0] = [];

  for (const session of sessions) {
    const studentId = session.student_id as string;
    const sessionId = String(session.id);
    if (briefExists.has(sessionId)) continue;

    const startMs = new Date(String(session.start_time)).getTime();
    const hoursUntil = (startMs - now.getTime()) / (60 * 60 * 1000);
    const isMomentum = momentumIds.has(studentId);
    const inEarlyWindow = hoursUntil > 20 && hoursUntil < 28;
    const inStandardWindow = hoursUntil > 1.5 && hoursUntil < 2.5;

    if (isMomentum && !inEarlyWindow) continue;
    if (!isMomentum && !inStandardWindow) continue;

    const studentEmail = metaByStudent[studentId]?.email;
    if (!studentEmail) continue;

    const startTime = session.start_time as string;
    const endTime = session.end_time as string;
    const durationMinutes = Math.max(
      15,
      Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000),
    );

    jobs.push({
      jobType: "ai.brief",
      idempotencyKey: `brief:${session.id}`,
      payload: {
        sessionId: session.id,
        studentId,
        studentEmail,
        studentDisplayName: nameByStudent[studentId] ?? null,
        course: session.course,
        startTime,
        endTime,
        durationMinutes,
        sendEmail: true,
        earlyBrief: isMomentum && inEarlyWindow,
      },
      priority: 2,
    });
  }

  const enqueueResult = await enqueueJobs(jobs);

  return {
    rows_scanned: sessions.length,
    rows_updated: enqueueResult.queued,
    rows_failed: enqueueResult.failed,
    total: sessions.length,
    briefJobsQueued: enqueueResult.queued,
    briefJobsExisting: enqueueResult.existing,
    skipped: sessions.length - jobs.length,
  };
}

export const GET = cronGetHandler("pre-session-brief", runPreSessionBriefCron);

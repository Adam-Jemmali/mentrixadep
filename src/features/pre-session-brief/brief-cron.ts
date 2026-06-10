import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { enqueueJobs } from "@/features/jobs/enqueue";
import { cronGetHandler } from "@/shared/core/cron-auth";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";

async function runPreSessionBriefCron() {
  const admin = createAdminClient();
  const now = new Date();

  const windowStart = new Date(now.getTime() + 115 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 125 * 60 * 1000);

  const { data: sessions, error: sessionsError } = await admin
    .from("sessions")
    .select("id, student_id, tutor_id, course, start_time, end_time, status")
    .neq("status", "cancelled")
    .neq("status", "completed")
    .gte("start_time", windowStart.toISOString())
    .lte("start_time", windowEnd.toISOString());

  if (sessionsError) {
    throw new Error(`DB query failed: ${sessionsError.message}`);
  }

  if (!sessions || sessions.length === 0) {
    return { rows_scanned: 0, rows_updated: 0, briefs: 0 };
  }

  const studentIds = [...new Set(sessions.map((s) => s.student_id as string))];

  const [settingsResults, metaByStudent] = await Promise.all([
    admin.from("user_settings").select("user_id, display_name").in("user_id", studentIds),
    getCachedUserMetaBatch(studentIds),
  ]);

  const nameByStudent = Object.fromEntries(
    (settingsResults.data ?? []).map((r) => [r.user_id, r.display_name as string | null]),
  );

  const jobs: Parameters<typeof enqueueJobs>[0] = [];

  for (const session of sessions) {
    const studentId = session.student_id as string;
    const studentEmail = metaByStudent[studentId]?.email;
    if (!studentEmail) continue;

    const startTime = session.start_time as string;
    const endTime = session.end_time as string;
    const durationMinutes = Math.max(
      15,
      Math.round(
        (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000,
      ),
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

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { type SessionEmailDetails } from "@/shared/integrations/email";
import { enqueueJobs } from "@/features/jobs/enqueue";
import { cronGetHandler } from "@/shared/core/cron-auth";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";

async function runSendRemindersCron() {
  const adminClient = createAdminClient();
  const now = new Date();

  const tutorWindowStart = new Date(now.getTime() + 30 * 60 * 1000);
  const tutorWindowEnd = new Date(now.getTime() + 35 * 60 * 1000);
  const studentWindowStart = new Date(now.getTime() + 115 * 60 * 1000);
  const studentWindowEnd = new Date(now.getTime() + 125 * 60 * 1000);

  const [tutorRes, studentRes] = await Promise.all([
    adminClient
      .from("sessions")
      .select("id, course, start_time, end_time, student_id, tutor_id, status")
      .neq("status", "cancelled")
      .neq("status", "completed")
      .gte("start_time", tutorWindowStart.toISOString())
      .lte("start_time", tutorWindowEnd.toISOString()),
    adminClient
      .from("sessions")
      .select("id, course, start_time, end_time, student_id, tutor_id, status")
      .neq("status", "cancelled")
      .neq("status", "completed")
      .gte("start_time", studentWindowStart.toISOString())
      .lte("start_time", studentWindowEnd.toISOString()),
  ]);

  if (tutorRes.error) throw new Error(`Failed to fetch sessions: ${tutorRes.error.message}`);
  if (studentRes.error) throw new Error(`Failed to fetch sessions: ${studentRes.error.message}`);

  const sessionsTutor = tutorRes.data ?? [];
  const sessionsStudent = studentRes.data ?? [];
  if (sessionsTutor.length === 0 && sessionsStudent.length === 0) {
    return { rows_scanned: 0, rows_updated: 0, reminders: 0 };
  }

  const userIds = Array.from(
    new Set(
      [...sessionsTutor, ...sessionsStudent].flatMap((s) => [s.student_id, s.tutor_id] as string[]),
    ),
  );
  const [{ data: settingsRows }, metaByUser] = await Promise.all([
    adminClient.from("user_settings").select("user_id, display_name").in("user_id", userIds),
    getCachedUserMetaBatch(userIds),
  ]);
  const nameByUser = Object.fromEntries(
    (settingsRows ?? []).map((r) => [r.user_id, r.display_name as string | null]),
  );

  const jobs: Parameters<typeof enqueueJobs>[0] = [];

  for (const session of sessionsTutor) {
    const details: SessionEmailDetails = {
      sessionId: session.id,
      course: session.course,
      startTime: session.start_time,
      endTime: session.end_time,
      studentDisplayName: nameByUser[session.student_id] ?? null,
      tutorDisplayName: nameByUser[session.tutor_id] ?? null,
      reminderMinutesBefore: 30,
    };
    const tutorEmail = metaByUser[session.tutor_id]?.email;
    if (tutorEmail) {
      jobs.push({
        jobType: "email.send",
        idempotencyKey: `reminder:tutor:${session.id}`,
        payload: {
          template: "session_reminder_tutor",
          to: tutorEmail,
          data: details,
        },
        priority: 1,
      });
    }
  }

  for (const session of sessionsStudent) {
    const details: SessionEmailDetails = {
      sessionId: session.id,
      course: session.course,
      startTime: session.start_time,
      endTime: session.end_time,
      studentDisplayName: nameByUser[session.student_id] ?? null,
      tutorDisplayName: nameByUser[session.tutor_id] ?? null,
      reminderMinutesBefore: 120,
    };
    const studentEmail = metaByUser[session.student_id]?.email;
    if (studentEmail) {
      jobs.push({
        jobType: "email.send",
        idempotencyKey: `reminder:student:${session.id}`,
        payload: {
          template: "session_reminder_student",
          to: studentEmail,
          data: details,
        },
        priority: 1,
      });
    }
  }

  const enqueueResult = await enqueueJobs(jobs);

  return {
    rows_scanned: sessionsTutor.length + sessionsStudent.length,
    rows_updated: enqueueResult.queued,
    reminders: enqueueResult.queued,
    remindersExisting: enqueueResult.existing,
    remindersFailed: enqueueResult.failed,
  };
}

export const GET = cronGetHandler("send-reminders", runSendRemindersCron);

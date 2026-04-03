import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendSessionReminderStudentEmail,
  sendSessionReminderTutorEmail,
  type SessionEmailDetails,
} from "@/lib/email";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) return auth.response;

  return runCronJob("send-reminders", async () => {
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
        [...sessionsTutor, ...sessionsStudent].flatMap((s) => [s.student_id, s.tutor_id] as string[])
      ),
    );
    const { data: settingsRows } = await adminClient
      .from("user_settings")
      .select("user_id, display_name")
      .in("user_id", userIds);
    const nameByUser = Object.fromEntries(
      (settingsRows ?? []).map((r) => [r.user_id, r.display_name as string | null])
    );

    let sent = 0;

    const sendForSessions = async (
      sessions: typeof sessionsTutor,
      kind: "tutor" | "student"
    ) => {
      await Promise.all(
        sessions.map(async (session) => {
          const details: SessionEmailDetails = {
            sessionId: session.id,
            course: session.course,
            startTime: session.start_time,
            endTime: session.end_time,
            studentDisplayName: nameByUser[session.student_id] ?? null,
            tutorDisplayName: nameByUser[session.tutor_id] ?? null,
            reminderMinutesBefore: kind === "tutor" ? 30 : 120,
          };

          const [studentAuth, tutorAuth] = await Promise.all([
            adminClient.auth.admin.getUserById(session.student_id),
            adminClient.auth.admin.getUserById(session.tutor_id),
          ]);

          const studentEmail = studentAuth.data?.user?.email;
          const tutorEmail = tutorAuth.data?.user?.email;

          const tasks: Promise<void>[] = [];
          if (kind === "tutor" && tutorEmail) {
            tasks.push(sendSessionReminderTutorEmail(tutorEmail, details));
          }
          if (kind === "student" && studentEmail) {
            tasks.push(
              sendSessionReminderStudentEmail(studentEmail, {
                ...details,
                preSessionBriefUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/student`,
              })
            );
          }

          await Promise.all(tasks);
          sent += tasks.length;
        })
      );
    };

    await sendForSessions(sessionsTutor, "tutor");
    await sendForSessions(sessionsStudent, "student");

    return {
      rows_scanned: sessionsTutor.length + sessionsStudent.length,
      rows_updated: sent,
      reminders: sent,
    };
  });
}

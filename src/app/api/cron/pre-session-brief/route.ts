/**
 * Cron: /api/cron/pre-session-brief
 * Fires every 15 minutes. Finds sessions starting in 115–125 minutes
 * (i.e. ~2 hours away) and generates a Pre-Session Brief for each student.
 *
 * Add to vercel.json crons (every 15 minutes):
 *   path: /api/cron/pre-session-brief
 *
 * Protected by CRON_SECRET (Authorization: Bearer <secret>).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndStorePreSessionBrief } from "@/app/actions/pre-session-brief";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) return auth.response;

  return runCronJob("pre-session-brief", async () => {
    const admin = createAdminClient();
    const now = new Date();

    // Window: sessions starting 115–125 minutes from now (~2 hours)
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

    // Resolve student emails and display names
    const studentIds = [...new Set(sessions.map((s) => s.student_id as string))];

    const [authResults, settingsResults] = await Promise.all([
      Promise.all(
        studentIds.map(async (id) => {
          const { data } = await admin.auth.admin.getUserById(id);
          return { id, email: data?.user?.email ?? null };
        })
      ),
      admin
        .from("user_settings")
        .select("user_id, display_name")
        .in("user_id", studentIds),
    ]);

    const emailByStudent = Object.fromEntries(
      authResults.map((r) => [r.id, r.email])
    );
    const nameByStudent = Object.fromEntries(
      (settingsResults.data ?? []).map((r) => [
        r.user_id,
        r.display_name as string | null,
      ])
    );

    let generated = 0;
    let skipped = 0;
    let failed = 0;

    await Promise.allSettled(
      sessions.map(async (session) => {
        const studentEmail = emailByStudent[session.student_id as string];
        if (!studentEmail) {
          skipped++;
          return;
        }

        const startTime = session.start_time as string;
        const endTime = session.end_time as string;
        const durationMinutes = Math.max(
          15,
          Math.round(
            (new Date(endTime).getTime() - new Date(startTime).getTime()) /
              60_000
          )
        );

        const result = await generateAndStorePreSessionBrief({
          sessionId: session.id as string,
          studentId: session.student_id as string,
          studentEmail,
          studentDisplayName: nameByStudent[session.student_id as string] ?? null,
          course: session.course as string,
          startTime,
          endTime,
          durationMinutes,
          sendEmail: true,
        });

        if (result.ok) {
          generated++;
        } else {
          failed++;
          console.error(
            `[cron/pre-session-brief] Failed for session ${session.id}: ${result.reason}`
          );
        }
      })
    );

    return {
      rows_scanned: sessions.length,
      rows_updated: generated,
      rows_failed: failed,
      total: sessions.length,
      generated,
      skipped,
      failed,
    };
  });
}

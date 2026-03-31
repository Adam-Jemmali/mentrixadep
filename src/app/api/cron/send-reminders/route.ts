import { createAdminClient } from "@/lib/supabase/admin";
import { getCronSecret } from "@/lib/env";
import { sendSessionReminderEmail, type SessionEmailDetails } from "@/lib/email";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = getCronSecret();

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();
    const now = new Date();
    // Window: sessions starting 30–35 minutes from now
    const windowStart = new Date(now.getTime() + 30 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

    const { data: sessions, error } = await adminClient
      .from("sessions")
      .select("id, course, start_time, end_time, student_id, tutor_id, status")
      .neq("status", "cancelled")
      .neq("status", "completed")
      .gte("start_time", windowStart.toISOString())
      .lte("start_time", windowEnd.toISOString());

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ success: true, reminders: 0 });
    }

    let sent = 0;

    await Promise.all(
      sessions.map(async (session) => {
        const details: SessionEmailDetails = {
          sessionId: session.id,
          course: session.course,
          startTime: session.start_time,
          endTime: session.end_time,
        };

        const [studentAuth, tutorAuth] = await Promise.all([
          adminClient.auth.admin.getUserById(session.student_id),
          adminClient.auth.admin.getUserById(session.tutor_id),
        ]);

        const studentEmail = studentAuth.data?.user?.email;
        const tutorEmail = tutorAuth.data?.user?.email;

        const tasks: Promise<void>[] = [];
        if (studentEmail) tasks.push(sendSessionReminderEmail(studentEmail, details, "student"));
        if (tutorEmail) tasks.push(sendSessionReminderEmail(tutorEmail, details, "tutor"));

        await Promise.all(tasks);
        sent += tasks.length;
      })
    );

    return NextResponse.json({ success: true, reminders: sent });
  } catch (error) {
    console.error("[cron/send-reminders] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

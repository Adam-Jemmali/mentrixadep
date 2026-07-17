/**
 * Guide breakthrough email notifications — internal server-only.
 * Not a server action module; import from trusted server code only.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { queueEmailJob } from "@/features/jobs/queue-helpers";

export async function notifyGuideOfBreakthrough(params: {
  sessionId: string;
  studentId: string;
  concept: string;
  accuracyBefore: number;
  accuracyAfter: number;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: session } = await admin
      .from("sessions")
      .select("id, tutor_id, course")
      .eq("id", params.sessionId)
      .maybeSingle();

    if (!session?.tutor_id) return;

    const { data: settings } = await admin
      .from("user_settings")
      .select("display_name")
      .eq("user_id", params.studentId)
      .maybeSingle();

    const { data: authStudent } = await admin.auth.admin.getUserById(params.studentId);
    const studentName =
      (typeof settings?.display_name === "string" && settings.display_name.trim()) ||
      authStudent?.user?.email?.split("@")[0] ||
      "Your student";

    const { data: authTutor } = await admin.auth.admin.getUserById(session.tutor_id);
    const tutorEmail = authTutor?.user?.email;
    if (!tutorEmail) return;

    await queueEmailJob(`breakthrough_guide:${params.sessionId}:${params.studentId}`, {
      template: "breakthrough_guide",
      to: tutorEmail,
      data: {
        studentName,
        concept: params.concept,
        accuracyBefore: Math.round(params.accuracyBefore),
        accuracyAfter: Math.round(params.accuracyAfter),
        course: session.course,
      },
    });
  } catch {
    // Best-effort
  }
}

"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { isMissingCancelledSessionColumnsError } from "@/features/booking/booking-internal";
import { invalidateStudentHubCache } from "@/features/student-profile/hub-snapshot";

export async function cancelSession(sessionId: string, onBehalfOfUserId?: string) {
  const user = await requireRole(["student", "admin"]);

  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client = user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

  const { data: session, error: sessionError } = await client
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("student_id", actingAsId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found or you don't have permission");
  }

  const sessionStart = new Date(session.start_time);
  const now = new Date();
  const minutesUntilStart = (sessionStart.getTime() - now.getTime()) / (1000 * 60);

  if (minutesUntilStart <= 24 * 60) {
    throw new Error("Cannot cancel session less than 24 hours before start time");
  }

  const cancelledAt = new Date().toISOString();
  let { error: updateError } = await client
    .from("sessions")
    .update({
      status: "cancelled",
      cancelled_at: cancelledAt,
      cancelled_by_role: "student",
    })
    .eq("id", sessionId)
    .eq("student_id", actingAsId);

  if (updateError && isMissingCancelledSessionColumnsError(updateError)) {
    ({ error: updateError } = await client
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("id", sessionId)
      .eq("student_id", actingAsId));
  }

  if (updateError) {
    throw new Error(`Failed to cancel session: ${updateError.message}`);
  }

  await invalidateStudentHubCache(actingAsId);
  if (session.tutor_id) await invalidateStudentHubCache(session.tutor_id as string);

  revalidatePath("/student");
  return { success: true };
}

"use server";

import { requireAuth, requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { sanitizeError, validateUUID } from "@/shared/core/security";
import { deleteRegistrationRequestsByIdentityEmail } from "@/features/registration/delete-registration-requests-by-email";

/**
 * FERPA/COPPA data processor allowlist.
 * Student PII may only be sent to explicitly approved processors.
 */
const APPROVED_STUDENT_DATA_PROCESSORS = ["stripe", "resend"] as const;
export type ApprovedProcessor = (typeof APPROVED_STUDENT_DATA_PROCESSORS)[number];

export function assertApprovedStudentDataProcessor(processor: string): asserts processor is ApprovedProcessor {
  if (!APPROVED_STUDENT_DATA_PROCESSORS.includes(processor as ApprovedProcessor)) {
    throw new Error(`Unapproved student-data processor: ${processor}`);
  }
}

async function deleteUserDataInternal(userId: string): Promise<void> {
  const admin = createAdminClient();
  const uid = validateUUID(userId);
  let authEmail: string | null = null;

  try {
    const { data } = await admin.auth.admin.getUserById(uid);
    authEmail = data.user?.email?.trim().toLowerCase() ?? null;
  } catch {
    authEmail = null;
  }

  // Best-effort deletion order across user-linked tables.
  // Keep failures isolated so one table does not block full data deletion.
  const tasks: Array<() => Promise<unknown>> = [
    async () => admin.from("institution_members").delete().eq("user_id", uid),
    async () => admin.from("push_subscriptions").delete().eq("user_id", uid),
    async () => admin.from("user_settings").delete().eq("user_id", uid),
    async () => admin.from("student_courses").delete().eq("student_id", uid),
    async () => admin.from("tutor_courses").delete().eq("tutor_id", uid),
    async () => admin.from("session_requests").delete().eq("student_id", uid),
    async () => admin.from("session_requests").delete().eq("tutor_id", uid),
    async () => admin.from("sessions").delete().eq("student_id", uid),
    async () => admin.from("sessions").delete().eq("tutor_id", uid),
    async () => admin.from("ratings").delete().eq("student_id", uid),
    async () => admin.from("ratings").delete().eq("tutor_id", uid),
    async () => admin.from("video_recordings").delete().eq("tutor_id", uid),
    async () => admin.from("user_quest_progress").delete().eq("user_id", uid),
    async () => admin.from("user_xp").delete().eq("user_id", uid),
    async () => admin.from("xp_award_ledger").delete().eq("user_id", uid),
    async () => admin.from("duel_queue").delete().eq("user_id", uid),
    async () =>
      admin
        .from("skill_duels")
        .delete()
        .or(`student_id.eq.${uid},opponent_student_id.eq.${uid}`),
    async () => admin.from("ai_rate_limits").delete().eq("user_id", uid),
  ];
  await Promise.allSettled(tasks.map((run) => run()));

  if (authEmail) {
    await deleteRegistrationRequestsByIdentityEmail(admin, authEmail);
  }

  // Ensure public profile row is removed even if auth cascade did not fire yet.
  await admin.from("users").delete().eq("id", uid);

  // Remove auth user last (cascades `public.users` through FK where configured)
  await admin.auth.admin.deleteUser(uid, false);
}

/**
 * User-initiated account deletion (right to erasure).
 */
export async function deleteOwnUserData(): Promise<{ success: true } | { error: string }> {
  try {
    const user = await requireAuth();
    await deleteUserDataInternal(user.id);
    return { success: true };
  } catch (e) {
    return { error: sanitizeError(e) };
  }
}

/**
 * Admin-initiated account deletion (compliance/abuse workflow).
 */
export async function deleteUserData(userId: string): Promise<{ success: true } | { error: string }> {
  try {
    await requireRole(["admin"]);
    await deleteUserDataInternal(userId);
    return { success: true };
  } catch (e) {
    return { error: sanitizeError(e) };
  }
}

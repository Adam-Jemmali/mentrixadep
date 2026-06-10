import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { fetchRegistrationRequestRow } from "@/features/registration/registration-request-lookup";

/**
 * When `registration_requests` is waitlist-approved but `public.users` was created with
 * `approved = false` (signup trigger uses auto-approve only), promote the row once we have a session.
 *
 * Must run after email confirmation and on any OAuth redirect path so middleware sees approved status.
 */
export async function syncApprovedWaitlistToUserProfile(
  userId: string,
  email: string | null | undefined,
): Promise<void> {
  const norm = email?.trim().toLowerCase();
  if (!norm) return;

  const admin = createAdminClient();
  const requestRow = await fetchRegistrationRequestRow(admin, norm);

  if (requestRow?.status !== "approved") return;

  const { data: userRow, error: userErr } = await admin
    .from("users")
    .select(
      "role, approved, status, stripe_account_id, stripe_account_id_test, stripe_account_id_live",
    )
    .eq("id", userId)
    .maybeSingle();

  if (userErr) {
    console.error("[waitlist-user-sync] users lookup:", userErr.message);
    return;
  }

  if (userRow?.role === "admin") {
    const { error: updErr } = await admin
      .from("users")
      .update({ approved: true, status: "approved" })
      .eq("id", userId);
    if (updErr) console.error("[waitlist-user-sync] admin promote:", updErr.message);
    return;
  }

  const nextRole = requestRow.role === "tutor" ? "tutor" : "student";

  const hasStripeConnect =
    Boolean(
      userRow?.stripe_account_id?.trim() ||
        userRow?.stripe_account_id_test?.trim() ||
        userRow?.stripe_account_id_live?.trim(),
    );

  /**
   * Never let waitlist RR=`student` overwrite a real Guide:
   * - existing `users.role = tutor`, or
   * - already downgraded to `student` but Stripe Connect is set (guides only).
   */
  const roleToPersist =
    nextRole === "student" &&
    (userRow?.role === "tutor" || (userRow?.role === "student" && hasStripeConnect))
      ? "tutor"
      : nextRole;

  const { error: updErr } = await admin
    .from("users")
    .update({
      approved: true,
      status: "approved",
      role: roleToPersist,
    })
    .eq("id", userId);

  if (updErr) {
    console.error("[waitlist-user-sync] users update:", updErr.message);
  }
}

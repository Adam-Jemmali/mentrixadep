import { createAdminClient } from "@/lib/supabase/admin";

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
  const { data: requestRow, error: reqErr } = await admin
    .from("registration_requests")
    .select("status, role")
    .eq("email", norm)
    .maybeSingle();

  if (reqErr) {
    console.error("[waitlist-user-sync] registration_requests:", reqErr.message);
    return;
  }

  if (requestRow?.status !== "approved") return;

  const { data: userRow, error: userErr } = await admin
    .from("users")
    .select("role, approved, status")
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

  const { error: updErr } = await admin
    .from("users")
    .update({
      approved: true,
      status: "approved",
      role: nextRole,
    })
    .eq("id", userId);

  if (updErr) {
    console.error("[waitlist-user-sync] users update:", updErr.message);
  }
}

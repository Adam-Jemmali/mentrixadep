import { createClient } from "@/lib/supabase/server";
import { normalizeAccessStatus } from "@/lib/user-access-status";
import { syncApprovedWaitlistToUserProfile } from "@/lib/waitlist-user-sync";
import { getPostApprovalRedirectPath } from "@/lib/post-approval-redirect";
import { isWaitlistEnabled } from "@/lib/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchRegistrationRequestRow } from "@/lib/registration-request-lookup";

/**
 * Where to send the user after email/OAuth callback when no explicit `next` path applies.
 * Shared by `/auth/callback` and `/auth/activate` (Google-only session skip).
 */
export async function resolvePostAuthDestination(): Promise<string> {
  const supabase = await createClient();
  const waitlistEnabled = isWaitlistEnabled();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/auth/signin";
  }

  await syncApprovedWaitlistToUserProfile(user.id, user.email);

  const { data: userRow } = await supabase
    .from("users")
    .select("role, status, approved, is_blacklisted")
    .eq("id", user.id)
    .maybeSingle();
  let resolvedUserRow = userRow;
  if (!resolvedUserRow?.role) {
    return "/auth/select-role";
  }

  let accessStatus = normalizeAccessStatus(resolvedUserRow);
  if (waitlistEnabled && accessStatus !== "approved") {
    const email = (user.email ?? "").trim().toLowerCase();
    if (email) {
      const admin = createAdminClient();
      const regRow = await fetchRegistrationRequestRow(admin, email);
      if (regRow?.status === "approved") {
        await syncApprovedWaitlistToUserProfile(user.id, user.email);
        const { data: refreshed } = await supabase
          .from("users")
          .select("role, status, approved, is_blacklisted")
          .eq("id", user.id)
          .maybeSingle();
        if (refreshed?.role) {
          resolvedUserRow = refreshed;
          accessStatus = normalizeAccessStatus(resolvedUserRow);
        }
      }
    }
  }

  if (accessStatus === "approved") {
    return getPostApprovalRedirectPath({ userId: user.id, role: resolvedUserRow.role });
  }
  if (accessStatus === "suspended") {
    return "/suspended";
  }
  return "/auth/session-sync";
}

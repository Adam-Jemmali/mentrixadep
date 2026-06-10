import { redirect } from "next/navigation";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { normalizeAccessStatus } from "@/shared/core/user-access-status";
import { syncApprovedWaitlistToUserProfile } from "@/features/registration/waitlist-user-sync";
import { getPostApprovalRedirectPath } from "@/shared/core/post-approval-redirect";
import { fetchRegistrationRequestRow } from "@/features/registration/registration-request-lookup";
import { isWaitlistEnabled } from "@/shared/core/flags";

/**
 * Auth sync gateway — runs after every login/signup/Google OAuth.
 *
 * Priority order:
 *  1. registration_requests.status === "approved"  → force-sync + dashboard (single source of truth)
 *  2. users.status === "approved"                  → dashboard
 *  3. suspended                                    → /suspended
 *  4. no role yet                                  → /auth/select-role
 *  5. anything else                                → /auth/signin (not approved yet)
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin?signin=1");
  }

  const email = (user.email ?? "").trim().toLowerCase();

  // ── Step 1: onboarding approval is the single source of truth ──────────────
  // Check registration_requests FIRST. If admin has approved this email once,
  // that is sufficient — skip the users.status check entirely.
  if (isWaitlistEnabled() && email) {
    const admin = createAdminClient();
    const regRow = await fetchRegistrationRequestRow(admin, email);
    if (regRow?.status === "approved") {
      // Force-sync approved status into users row (best-effort, fire-and-forget safe)
      await syncApprovedWaitlistToUserProfile(user.id, user.email);

      // Read role for redirect target — admin client bypasses RLS so it's always fresh
      const { data: freshUserRow } = await admin
        .from("users")
        .select("role, status, approved, is_blacklisted")
        .eq("id", user.id)
        .maybeSingle();

      const role =
        freshUserRow?.role ??
        (regRow.role === "tutor" ? "tutor" : "student");

      redirect(
        await getPostApprovalRedirectPath({
          userId: user.id,
          role,
        }),
      );
    }
  }

  // ── Step 2: no active onboarding approval — check users row directly ───────
  await syncApprovedWaitlistToUserProfile(user.id, user.email);

  const { data: userRow } = await supabase
    .from("users")
    .select("role, status, approved, is_blacklisted")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow?.role) {
    redirect("/auth/select-role");
  }

  const accessStatus = normalizeAccessStatus(userRow);

  if (accessStatus === "suspended") {
    redirect("/suspended");
  }

  if (accessStatus === "approved") {
    redirect(
      await getPostApprovalRedirectPath({
        userId: user.id,
        role: userRow.role,
      }),
    );
  }

  // ── Step 3: genuinely not approved yet — send back to sign-in ──────────────
  redirect("/auth/signin?signin=1");
}

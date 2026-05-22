"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPostApprovalRedirectPath } from "@/lib/post-approval-redirect";
import {
  OAUTH_INTENT_COOKIE,
  OAUTH_ROLE_COOKIE,
} from "@/lib/oauth-auth";
import {
  validateEmail,
  validatePassword,
  validateRole,
  sanitizeError,
  enforceRateLimit,
  enforceSlidingRateLimit,
  RATE_LIMITS,
  getRateLimitId,
  sanitizeInput,
} from "@/lib/security";
import { createVerificationForUser } from "@/app/actions/verification";
import { trackEvent } from "@/lib/analytics";
import { tryAutoAssociateInstitution } from "@/app/actions/institution";
import { signUpServerSchema } from "@/lib/schemas";
import { getSiteUrl } from "@/lib/site";
import { isWaitlistEnabled } from "@/lib/flags";
import { normalizeAccessStatus } from "@/lib/user-access-status";
import { syncApprovedWaitlistToUserProfile } from "@/lib/waitlist-user-sync";
import { fetchRegistrationRequestRow } from "@/lib/registration-request-lookup";
import {
  resendOnboardingConfirmationEmail,
  submitRegistrationRequest,
} from "@/lib/registration-request-join";

async function fetchAutoApproveRegistrationsEnabled(): Promise<boolean> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("system_settings")
      .select("value")
      .eq("key", "auto_approve_registrations")
      .single();
    return data?.value?.enabled === true;
  } catch {
    return false;
  }
}

async function getRegistrationRequestStatus(email: string | undefined): Promise<{
  status: "pending" | "approved" | "rejected" | null;
  role: "student" | "tutor" | null;
}> {
  const normEmail = email?.trim().toLowerCase();
  if (!normEmail) return { status: null, role: null };
  try {
    const adminClient = createAdminClient();
    const data = await fetchRegistrationRequestRow(adminClient, normEmail);
    return {
      status: (data?.status as "pending" | "approved" | "rejected" | undefined) ?? null,
      role: (data?.role as "student" | "tutor" | undefined) ?? null,
    };
  } catch {
    return { status: null, role: null };
  }
}

/** Applies role + approval + JWT + registration_requests (admin upsert). */
export async function applyRoleAndSyncProfile(
  userId: string,
  email: string | undefined,
  role: "student" | "tutor"
): Promise<void> {
  const supabase = await createClient();
  const autoApprove = await fetchAutoApproveRegistrationsEnabled();
  const waitlistEnabled = isWaitlistEnabled();
  const waitlist = await getRegistrationRequestStatus(email);
  const waitlistStatus = waitlist.status;
  const waitlistRole = waitlist.role;

  if (waitlistEnabled && waitlistStatus !== "approved") {
    const admin = createAdminClient();
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch (e) {
      console.error("[applyRoleAndSyncProfile] failed to delete non-approved waitlist user from auth:", e);
    }
    throw new Error(
      "This email is not approved yet. Complete onboarding approval first, then continue account activation.",
    );
  }

  if (waitlistEnabled && waitlistRole && waitlistRole !== role) {
    const admin = createAdminClient();
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch (e) {
      console.error("[applyRoleAndSyncProfile] failed to delete mismatched-role user from auth:", e);
    }
    throw new Error(
      `This email is already approved as a ${waitlistRole === "tutor" ? "Guide" : "Mentrixer"}. Please continue with the same role or contact support@mentrixa.one if this is incorrect.`
    );
  }

  // Rejected emails cannot re-register — delete the newly created auth account and block
  if (waitlistEnabled && waitlistStatus === "rejected") {
    const admin = createAdminClient();
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch (e) {
      console.error("[applyRoleAndSyncProfile] failed to delete rejected user from auth:", e);
    }
    throw new Error("Your access request was not approved. Contact support@mentrixa.one for assistance.");
  }

  const approved = !waitlistEnabled || waitlistStatus === "approved" || (role === "student" && autoApprove);

  const admin = createAdminClient();
  const { error: uErr } = await admin
    .from("users")
    .update({
      role,
      approved,
      status: approved ? "approved" : "pending",
      age_confirmed_13_or_older: true,
      age_confirmed_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (uErr) {
    console.error("[applyRoleAndSyncProfile] users update:", uErr);
    throw new Error("Failed to update profile");
  }

  const { error: authErr } = await supabase.auth.updateUser({
    data: { role, approved },
  });

  if (authErr) {
    console.error("[applyRoleAndSyncProfile] auth update:", authErr);
  }

  const normEmail = email?.trim().toLowerCase();
  if (normEmail) {
    const admin = createAdminClient();
    const linkedAt = new Date().toISOString();
    const rQuery = admin
      .from("registration_requests")
      .update({
        role,
        ...(waitlistEnabled ? {} : { status: "approved" }),
        updated_at: linkedAt,
        account_linked_at: linkedAt,
      })
      .eq("email", normEmail);
    if (waitlistEnabled) {
      rQuery.eq("status", "approved");
    }
    const { error: rErr } = await rQuery;
    if (rErr) {
      console.error("[applyRoleAndSyncProfile] registration_requests:", rErr);
    }
  }

  // Create background verification (tutor=24h, student=48h); full access during window
  try {
    await createVerificationForUser(userId, role, email ?? "", undefined);
  } catch (e) {
    console.error("[applyRoleAndSyncProfile] createVerificationForUser:", e);
  }

  void trackEvent("signup_completed", { userId, properties: { role } });
  void trackEvent("role_selected", { userId, properties: { role } });

  // Auto-associate with institution if email domain matches
  if (email) {
    void tryAutoAssociateInstitution(userId, email);
  }

  revalidatePath("/", "layout");
}


async function clearOAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(OAUTH_INTENT_COOKIE);
  store.delete(OAUTH_ROLE_COOKIE);
}

async function getWaitlistStatusByEmail(email: string | undefined): Promise<"pending" | "approved" | "rejected" | null> {
  const normEmail = email?.trim().toLowerCase();
  if (!normEmail) return null;
  try {
    const admin = createAdminClient();
    const data = await fetchRegistrationRequestRow(admin, normEmail);
    return (data?.status as "pending" | "approved" | "rejected" | undefined) ?? null;
  } catch {
    return null;
  }
}

function signupAccessSubmittedPath(
  email: string,
  role: "student" | "tutor",
  confirmationEmailSent?: boolean,
): string {
  const base = `/auth/signup?access=submitted&email=${encodeURIComponent(email)}&role=${role}`;
  return confirmationEmailSent === false ? `${base}&emailSent=0` : base;
}

/** Onboarding join + sign-out; approved users go to activate while still signed in. */
async function resolveNewUserOnboardingRedirect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string,
  role: "student" | "tutor",
  existingRole: string | null,
): Promise<string> {
  let result = await submitRegistrationRequest(email, role);
  if (
    (result.outcome === "pending" || result.outcome === "approved") &&
    result.confirmationEmailSent !== true
  ) {
    const resent = await resendOnboardingConfirmationEmail(email, role);
    if (resent) {
      result = { ...result, confirmationEmailSent: true };
    }
  }
  await clearOAuthCookies();

  if (result.outcome === "approved") {
    if (!existingRole) {
      await applyRoleAndSyncProfile(userId, email, role);
    }
    return `/auth/activate?email=${encodeURIComponent(email)}&role=${role}`;
  }

  if (result.outcome === "rejected") {
    await supabase.auth.signOut();
    return `/auth/signup?error=waitlist_rejected&role=${role}`;
  }

  if (result.outcome === "error") {
    await supabase.auth.signOut();
    return `/auth/signup?role=${role}`;
  }

  await supabase.auth.signOut();
  return signupAccessSubmittedPath(email, role, result.confirmationEmailSent);
}

/**
 * Reads OAuth bridge cookies and applies signup role, then returns the next path.
 * Used after Google Identity Services and after email callback (via getPostOAuthRedirectPath).
 */
export async function resolveOAuthSessionRedirect(): Promise<string> {
  const supabase = await createClient();
  const waitlistEnabled = isWaitlistEnabled();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return "/auth/signin?signin=1";
  }

  await syncApprovedWaitlistToUserProfile(user.id, user.email);

  const store = await cookies();
  const intent = store.get(OAUTH_INTENT_COOKIE)?.value;
  const roleCookie = store.get(OAUTH_ROLE_COOKIE)?.value;
  const { data: existingUserRow } = await supabase
    .from("users")
    .select("role, approved, status, is_blacklisted")
    .eq("id", user.id)
    .maybeSingle();
  const existingRole = existingUserRow?.role ?? null;
  const existingStatus = normalizeAccessStatus(existingUserRow);
  const existingApproved = existingStatus === "approved";
  const waitlistStatus = await getWaitlistStatusByEmail(user.email);
  const signupRoleFromCookie = roleCookie === "student" || roleCookie === "tutor" ? roleCookie : null;

  if (waitlistEnabled && waitlistStatus === "rejected") {
    await clearOAuthCookies();
    await supabase.auth.signOut();
    return "/auth/signup?error=waitlist_rejected&role=student";
  }

  if (!existingRole) {
    const pendingEmail = (user.email ?? "").trim().toLowerCase();
    const pendingRole = signupRoleFromCookie ?? "student";
    if (!pendingEmail) {
      await clearOAuthCookies();
      await supabase.auth.signOut();
      return "/auth/signin?signin=1";
    }
    return resolveNewUserOnboardingRedirect(supabase, user.id, pendingEmail, pendingRole, null);
  }

  if (!existingApproved) {
    const pendingEmail = (user.email ?? "").trim().toLowerCase();
    const reg = await getRegistrationRequestStatus(user.email);
    const pendingRole =
      reg.role === "tutor" || reg.role === "student"
        ? reg.role
        : existingRole === "tutor" || existingRole === "student"
          ? existingRole
          : signupRoleFromCookie ?? "student";

    if (waitlistEnabled && waitlistStatus === "approved" && pendingEmail) {
      await clearOAuthCookies();
      return `/auth/activate?email=${encodeURIComponent(pendingEmail)}&role=${pendingRole}`;
    }

    if (waitlistEnabled && waitlistStatus === "pending" && pendingEmail) {
      const regResult = await submitRegistrationRequest(pendingEmail, pendingRole);
      let emailed = regResult.confirmationEmailSent === true;
      if (!emailed) {
        emailed = await resendOnboardingConfirmationEmail(pendingEmail, pendingRole);
      }
      await clearOAuthCookies();
      await supabase.auth.signOut();
      return signupAccessSubmittedPath(pendingEmail, pendingRole, emailed);
    }

    if (waitlistEnabled && waitlistStatus !== "approved" && pendingEmail) {
      return resolveNewUserOnboardingRedirect(supabase, user.id, pendingEmail, pendingRole, existingRole);
    }
  }

  if (intent === "signup" && signupRoleFromCookie) {
    // Guard against stale signup cookies accidentally downgrading existing accounts.
    // Existing approved users (especially admins) should never be role-overwritten by cookie state.
    if (!existingRole || !existingApproved) {
      await applyRoleAndSyncProfile(user.id, user.email ?? undefined, signupRoleFromCookie);
    }
    await clearOAuthCookies();
  } else if (intent === "signup") {
    await clearOAuthCookies();
    if (existingRole && existingApproved) {
      return getPostApprovalRedirectPath({ userId: user.id, role: existingRole });
    }
    return "/auth/select-role";
  } else if (intent === "signin") {
    await clearOAuthCookies();
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role, approved, status, is_blacklisted")
    .eq("id", user.id)
    .maybeSingle();
  let resolvedUserData = userData;
  if (!resolvedUserData?.role) {
    return "/auth/select-role";
  }

  let accessStatus = normalizeAccessStatus(resolvedUserData);
  if (waitlistEnabled && accessStatus !== "approved") {
    const latestWaitlist = await getRegistrationRequestStatus(user.email ?? undefined);
    if (latestWaitlist.status === "approved") {
      await syncApprovedWaitlistToUserProfile(user.id, user.email);
      const { data: refreshed } = await supabase
        .from("users")
        .select("role, approved, status, is_blacklisted")
        .eq("id", user.id)
        .maybeSingle();
      if (refreshed?.role) {
        resolvedUserData = refreshed;
        accessStatus = normalizeAccessStatus(resolvedUserData);
      }
    }
  }

  if (accessStatus === "suspended") {
    return "/suspended";
  }
  if (accessStatus !== "approved") {
    return "/auth/session-sync";
  }

  return getPostApprovalRedirectPath({ userId: user.id, role: resolvedUserData.role });
}

/** After GIS `signInWithIdToken` (no Supabase OAuth redirect). */
export async function getPostOAuthRedirectPath(): Promise<
  { path: string } | { error: string }
> {
  try {
    const path = await resolveOAuthSessionRedirect();
    return { path };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const identifier = getRateLimitId(user?.id);

    enforceRateLimit(identifier, RATE_LIMITS.signUp, "sign up");
    await enforceSlidingRateLimit(identifier, RATE_LIMITS.authPage, "auth.signUp");

    const parsed = signUpServerSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
      ageConfirmed:
        formData.get("ageConfirmed") === "true" ||
        formData.get("ageConfirmed") === "on" ||
        formData.get("ageConfirmed") === "1",
    });
    if (!parsed.success) {
      return {
        error:
          "Please enter valid signup details and confirm you are 13 years or older.",
      };
    }
    const email = sanitizeInput(validateEmail(parsed.data.email), "email");
    const password = validatePassword(parsed.data.password);
    const role = validateRole(parsed.data.role);

    if (role !== "student" && role !== "tutor") {
      return { error: "Invalid role" };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          age_confirmed_13_or_older: true,
        },
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });

    if (error) {
      return { error: sanitizeError(error) };
    }

    const sessionEstablished = !!data.session;

    return {
      success: true,
      sessionEstablished,
      email,
      message: "Registration request submitted. Please wait for admin approval.",
    };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function signIn(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user: prior },
    } = await supabase.auth.getUser();
    const identifier = getRateLimitId(prior?.id);

    enforceRateLimit(identifier, RATE_LIMITS.signIn, "sign in");
    await enforceSlidingRateLimit(identifier, RATE_LIMITS.authPage, "auth.signIn");

    const email = validateEmail(formData.get("email"));
    const password = validatePassword(formData.get("password"));

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: sanitizeError(error) };
    }

    if (data.user) {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        return { error: "Session not established" };
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("approved, role")
        .eq("id", data.user.id)
        .single();

      if (userError || !userData) {
        await supabase.auth.signOut();
        return { error: "Invalid credentials" };
      }

      void trackEvent("daily_login", {
        userId: data.user.id,
        properties: { role: userData.role ?? "unknown" },
      });
      revalidatePath("/", "layout");
      return {
        success: true,
        role: userData.role,
        approved: userData.approved,
      };
    }

    return { error: "Sign in failed - no user data returned" };
  } catch (error) {
    return { error: sanitizeError(error) };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function setUserRole(role: "student" | "tutor") {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Not authenticated" };
    }

    if (role !== "student" && role !== "tutor") {
      return { error: "Invalid role" };
    }

    await applyRoleAndSyncProfile(user.id, user.email ?? undefined, role);

    const { data: row } = await supabase
      .from("users")
      .select("approved, role")
      .eq("id", user.id)
      .single();

    return {
      success: true,
      approved: row?.approved ?? false,
      role: row?.role ?? role,
    };
  } catch (err) {
    return { error: sanitizeError(err) };
  }
}

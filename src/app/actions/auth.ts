"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getRoleHomePath } from "@/lib/role-home";
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

/** Applies role + approval + JWT + registration_requests (admin upsert). */
export async function applyRoleAndSyncProfile(
  userId: string,
  email: string | undefined,
  role: "student" | "tutor"
): Promise<void> {
  const supabase = await createClient();
  const autoApprove = await fetchAutoApproveRegistrationsEnabled();
  const approved = role === "student" && autoApprove;

  const { error: uErr } = await supabase
    .from("users")
    .update({
      role,
      approved,
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

  const status = role === "student" && autoApprove ? "approved" : "pending";
  const normEmail = email?.trim().toLowerCase();
  if (normEmail) {
    const admin = createAdminClient();
    const { error: rErr } = await admin.from("registration_requests").upsert(
      {
        email: normEmail,
        role,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );
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

/**
 * Reads OAuth bridge cookies and applies signup role, then returns the next path.
 * Used after Google Identity Services and after email callback (via getPostOAuthRedirectPath).
 */
export async function resolveOAuthSessionRedirect(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return "/auth/signin";
  }

  const store = await cookies();
  const intent = store.get(OAUTH_INTENT_COOKIE)?.value;
  const roleCookie = store.get(OAUTH_ROLE_COOKIE)?.value;
  const { data: existingUserRow } = await supabase
    .from("users")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle();
  const existingRole = existingUserRow?.role ?? null;
  const existingApproved = existingUserRow?.approved === true;

  if (intent === "signup" && (roleCookie === "student" || roleCookie === "tutor")) {
    // Guard against stale signup cookies accidentally downgrading existing accounts.
    // Existing approved users (especially admins) should never be role-overwritten by cookie state.
    if (!existingRole || !existingApproved) {
      await applyRoleAndSyncProfile(user.id, user.email ?? undefined, roleCookie);
    }
    await clearOAuthCookies();
  } else if (intent === "signup") {
    await clearOAuthCookies();
    if (existingRole && existingApproved) {
      return getRoleHomePath(existingRole);
    }
    return "/auth/select-role";
  } else if (intent === "signin") {
    await clearOAuthCookies();
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role, approved")
    .eq("id", user.id)
    .maybeSingle();

  if (!userData?.role) {
    return "/auth/select-role";
  }

  if (!userData.approved) {
    return "/pending-approval";
  }

  return getRoleHomePath(userData.role);
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
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
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
  return { success: true };
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
  } catch {
    return { error: "An unexpected error occurred" };
  }
}

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { resolveOAuthSessionRedirect } from "@/app/actions/auth";
import { normalizeAccessStatus } from "@/lib/user-access-status";
import { getRoleHomePath } from "@/lib/role-home";
import { OAUTH_INTENT_COOKIE } from "@/lib/oauth-auth";

const OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const;

type SupportedOtpType = (typeof OTP_TYPES)[number];

function isSupportedOtpType(value: string): value is SupportedOtpType {
  return OTP_TYPES.includes(value as SupportedOtpType);
}

async function resolvePostAuthDestination(): Promise<string> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/auth/signin";
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("role, status, approved, is_blacklisted")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email?.trim().toLowerCase();
  let effectiveUserRow = userRow;

  // If waitlist already approved this email, promote to approved on first confirmation callback.
  if (email) {
    const { data: requestRow } = await admin
      .from("registration_requests")
      .select("status, role")
      .eq("email", email)
      .maybeSingle();

    if (requestRow?.status === "approved") {
      const nextRole =
        effectiveUserRow?.role ?? (requestRow.role === "tutor" ? "tutor" : "student");
      await admin
        .from("users")
        .update({
          approved: true,
          status: "approved",
          role: nextRole,
        })
        .eq("id", user.id);

      const { data: refreshedRow } = await supabase
        .from("users")
        .select("role, status, approved, is_blacklisted")
        .eq("id", user.id)
        .maybeSingle();
      effectiveUserRow = refreshedRow ?? effectiveUserRow;
    }
  }

  if (!effectiveUserRow?.role) {
    return "/auth/select-role";
  }

  const accessStatus = normalizeAccessStatus(effectiveUserRow);
  if (accessStatus === "approved") {
    return getRoleHomePath(effectiveUserRow.role);
  }
  if (accessStatus === "suspended") {
    return "/suspended";
  }
  return "/pending-approval";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpTypeParam = requestUrl.searchParams.get("type");
  const nextParam = requestUrl.searchParams.get("next");
  const nextPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;

  const supabase = await createClient();
  const cookieStore = await cookies();
  const oauthIntent = cookieStore.get(OAUTH_INTENT_COOKIE)?.value;
  const hasOAuthIntent = oauthIntent === "signup" || oauthIntent === "signin";

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession:", error.message);
      if (error.message.toLowerCase().includes("otp_expired")) {
        const fallback = await resolvePostAuthDestination();
        redirect(fallback);
      }
      if (otpTypeParam === "recovery") {
        redirect("/auth/forgot-password?error=expired");
      }
      redirect("/auth/signin?error=oauth");
    }

    // Password reset — go directly to reset page to preserve the recovery session.
    // Do NOT call resolveOAuthSessionRedirect which would sign out unapproved users.
    if (otpTypeParam === "recovery") {
      redirect(nextPath ?? "/auth/reset-password");
    }

    if (nextPath) {
      redirect(nextPath);
    }

    if (otpTypeParam === "signup" || otpTypeParam === "email" || !hasOAuthIntent) {
      const path = await resolvePostAuthDestination();
      redirect(path);
    }

    try {
      const path = await resolveOAuthSessionRedirect();
      redirect(path);
    } catch (e) {
      console.error("[auth/callback] resolveOAuthSessionRedirect:", e);
      redirect("/auth/signin?error=oauth");
    }
  }

  if (tokenHash && otpTypeParam && isSupportedOtpType(otpTypeParam)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpTypeParam,
    });

    if (error) {
      console.error("[auth/callback] verifyOtp:", error.message);
      if (error.message.toLowerCase().includes("otp_expired")) {
        const fallback = await resolvePostAuthDestination();
        redirect(fallback);
      }
      if (otpTypeParam === "recovery") {
        redirect("/auth/forgot-password?error=expired");
      }
      redirect("/auth/signin?error=confirm");
    }

    // Password reset via token_hash — go directly to reset page
    if (otpTypeParam === "recovery") {
      redirect(nextPath ?? "/auth/reset-password");
    }

    if (nextPath) {
      redirect(nextPath);
    }

    if (otpTypeParam === "signup" || otpTypeParam === "email" || !hasOAuthIntent) {
      const path = await resolvePostAuthDestination();
      redirect(path);
    }

    try {
      const path = await resolveOAuthSessionRedirect();
      redirect(path);
    } catch (e) {
      console.error("[auth/callback] resolveOAuthSessionRedirect:", e);
      redirect("/auth/signin?error=confirm");
    }
  }

  const fallback = await resolvePostAuthDestination();
  redirect(fallback);
}


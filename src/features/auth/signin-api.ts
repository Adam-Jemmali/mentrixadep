import { NextResponse } from "next/server";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { sanitizeError, validateEmail, validatePassword, RATE_LIMITS, checkSlidingWindowRateLimit, getClientIpFromRequest } from "@/shared/core/security";
import { enforceApiRouteRateLimit } from "@/shared/core/security/rate-limiter";
import { clearAuthFailures, compositeRateKey, emailLockKey, emailRateKey, getAuthLockState, ipRateKey, registerAuthFailure } from "@/shared/core/security/auth-abuse";
import { isCaptchaConfigured, verifyTurnstileToken } from "@/shared/core/security/captcha";
import { reportAuthCaptchaFailure, reportAuthLockout, reportSecurityRateLimitDenied } from "@/shared/integrations/observability";
import { isWaitlistEnabled } from "@/shared/core/flags";
import { normalizeAccessStatus } from "@/shared/core/user-access-status";
import { syncApprovedWaitlistToUserProfile } from "@/features/registration/waitlist-user-sync";
import { fetchRegistrationRequestRow } from "@/features/registration/registration-request-lookup";
import { getPostApprovalRedirectPath } from "@/shared/core/post-approval-redirect";
import { identityEmailKey } from "@/shared/integrations/email/identity";

export const dynamic = "force-dynamic";

/** Browsers, tools, or prefetch that GET this API URL get 405 by default — send them to the sign-in page. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  u.pathname = "/auth/signin";
  u.search = "";
  return NextResponse.redirect(u);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: "POST, GET, OPTIONS" },
  });
}

type SignInBody = {
  email?: string;
  password?: string;
  captchaToken?: string;
  roleHint?: "student" | "tutor";
};

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  const retryAfterSeconds =
    status === 429 && typeof extra?.retryAfterSeconds === "number"
      ? extra.retryAfterSeconds
      : null;
  const headers =
    retryAfterSeconds !== null
      ? { "Retry-After": String(Math.max(1, retryAfterSeconds)) }
      : undefined;
  return NextResponse.json({ ok: false, error: message, ...extra }, { status, headers });
}

async function authUserExistsByEmail(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const key = identityEmailKey(email);
  const perPage = 200;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[auth/signin] listUsers failed:", error.message);
      return false;
    }
    const users = data?.users ?? [];
    if (users.some((u) => identityEmailKey((u.email ?? "").trim()) === key)) {
      return true;
    }
    if (users.length < perPage) return false;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const headers = req.headers;
    const ip = getClientIpFromRequest({ headers });
    const routeBlocked = await enforceApiRouteRateLimit("auth.signin", { ip });
    if (routeBlocked) return routeBlocked;

    const body = (await req.json().catch(() => ({}))) as SignInBody;
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);
    const roleHint = body.roleHint === "tutor" ? "tutor" : "student";
    let signupRoleHint: "student" | "tutor" = roleHint;

    const ipLimit = await checkSlidingWindowRateLimit(ipRateKey(ip), RATE_LIMITS.signInIpBurst.maxRequests, RATE_LIMITS.signInIpBurst.windowMs);
    if (!ipLimit.allowed) {
      reportSecurityRateLimitDenied({ scope: "auth.signin.ip", retryAfterSeconds: ipLimit.retryAfterSeconds });
      return jsonError("Too many attempts. Please wait and try again.", 429, { retryAfterSeconds: ipLimit.retryAfterSeconds });
    }
    const emailLimit = await checkSlidingWindowRateLimit(emailRateKey(email), RATE_LIMITS.signInEmailBurst.maxRequests, RATE_LIMITS.signInEmailBurst.windowMs);
    if (!emailLimit.allowed) {
      reportSecurityRateLimitDenied({ scope: "auth.signin.email", retryAfterSeconds: emailLimit.retryAfterSeconds });
      return jsonError("Too many attempts. Please wait and try again.", 429, { retryAfterSeconds: emailLimit.retryAfterSeconds });
    }
    const comboLimit = await checkSlidingWindowRateLimit(compositeRateKey(ip, email), RATE_LIMITS.signInIpEmailBurst.maxRequests, RATE_LIMITS.signInIpEmailBurst.windowMs);
    if (!comboLimit.allowed) {
      reportSecurityRateLimitDenied({ scope: "auth.signin.ip_email", retryAfterSeconds: comboLimit.retryAfterSeconds });
      return jsonError("Too many attempts. Please wait and try again.", 429, { retryAfterSeconds: comboLimit.retryAfterSeconds });
    }

    const lockKey = emailLockKey(email);
    const lock = await getAuthLockState(lockKey);
    const now = Date.now();
    if (lock.lockedUntil && lock.lockedUntil > now) {
      reportAuthLockout({
        keyType: "email",
        retryAfterSeconds: Math.max(1, Math.ceil((lock.lockedUntil - now) / 1000)),
      });
      return jsonError("Too many sign in attempts. Please wait before trying again.", 429, {
        retryAfterSeconds: Math.max(1, Math.ceil((lock.lockedUntil - now) / 1000)),
      });
    }

    const suspicious = lock.failureCount >= 3;
    if (suspicious && isCaptchaConfigured()) {
      const captcha = await verifyTurnstileToken(body.captchaToken, ip);
      if (!captcha.ok) {
        reportAuthCaptchaFailure({ reason: captcha.reason, hasToken: Boolean(body.captchaToken) });
        return jsonError("Security check required. Please refresh and try again.", 429, {
          code: captcha.reason,
          captchaRequired: true,
        });
      }
    }

    if (isWaitlistEnabled()) {
      const admin = createAdminClient();
      const waitlistRow = await fetchRegistrationRequestRow(admin, email);
      if (waitlistRow?.role === "tutor" || waitlistRow?.role === "student") {
        signupRoleHint = waitlistRow.role;
      }
      if (waitlistRow?.status === "rejected") {
        await registerAuthFailure(lockKey);
        return jsonError(
          "This email was not approved for access and cannot sign in. Please contact support@mentrixa.one if this seems incorrect.",
          403,
          { waitlistStatus: "rejected" }
        );
      }
      if (waitlistRow?.status === "pending") {
        await registerAuthFailure(lockKey);
        return jsonError(
          `This email is still pending ${waitlistRow.role === "tutor" ? "Guide" : "Mentrixer"} onboarding approval. Please wait before signing in.`,
          403,
          { waitlistStatus: "pending" }
        );
      }
    }

    const supabase = await createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !signInData.user?.id) {
      await registerAuthFailure(lockKey);
      
      // Check if the error indicates user doesn't exist (versus wrong password)
      const errorMsg = signInError?.message?.toLowerCase() ?? "";
      const isUserNotFound = 
        errorMsg.includes("invalid login credentials") || 
        errorMsg.includes("user not found") ||
        errorMsg.includes("400");

      // Provide a more helpful message if email is not registered
      if (isUserNotFound) {
        const exists = await authUserExistsByEmail(email);
        if (exists) {
          return jsonError("Incorrect email or password. Please try again.", 401);
        }
        return jsonError(
          "Email not registered. Start onboarding first to get access.",
          401,
          { redirectToSignup: true, signupRole: signupRoleHint }
        );
      }

      // Generic error for other cases
      return jsonError("Incorrect email or password. Please try again.", 401);
    }

    await syncApprovedWaitlistToUserProfile(signInData.user.id, signInData.user.email ?? email);

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("approved, role, status, is_blacklisted")
      .eq("id", signInData.user.id)
      .single();

    if (userError || !userData?.role) {
      await registerAuthFailure(lockKey);
      await supabase.auth.signOut();
      return jsonError("Sign in failed. Please contact support.", 403);
    }

    let resolvedUserData = userData;
    let accessStatus = normalizeAccessStatus(resolvedUserData);
    if (accessStatus !== "approved" && isWaitlistEnabled()) {
      const admin = createAdminClient();
      const waitlistRow = await fetchRegistrationRequestRow(admin, email);
      if (waitlistRow?.status === "approved") {
        await syncApprovedWaitlistToUserProfile(signInData.user.id, signInData.user.email ?? email);
        const { data: refreshedUserData } = await supabase
          .from("users")
          .select("approved, role, status, is_blacklisted")
          .eq("id", signInData.user.id)
          .single();
        if (refreshedUserData) {
          resolvedUserData = refreshedUserData;
          accessStatus = normalizeAccessStatus(resolvedUserData);
        }
      }
    }

    if (accessStatus === "suspended") {
      await clearAuthFailures(lockKey);
      return NextResponse.json({ ok: true, redirectTo: "/suspended" });
    }

    if (accessStatus !== "approved") {
      await clearAuthFailures(lockKey);
      return NextResponse.json({ ok: true, redirectTo: "/auth/session-sync" });
    }

    await clearAuthFailures(lockKey);
    const redirectTo = await getPostApprovalRedirectPath({
      userId: signInData.user.id,
      role: resolvedUserData.role,
    });
    return NextResponse.json({ ok: true, redirectTo });
  } catch (error) {
    return jsonError(sanitizeError(error), 400);
  }
}


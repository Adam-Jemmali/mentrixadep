import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeError, validateEmail, validatePassword, RATE_LIMITS, checkSlidingWindowRateLimit, getClientIpFromRequest } from "@/lib/security";
import { clearAuthFailures, compositeRateKey, emailLockKey, emailRateKey, getAuthLockState, ipRateKey, registerAuthFailure } from "@/lib/security/auth-abuse";
import { isCaptchaConfigured, verifyTurnstileToken } from "@/lib/security/captcha";
import { getRoleHomePath } from "@/lib/role-home";
import { reportAuthCaptchaFailure, reportAuthLockout, reportSecurityRateLimitDenied } from "@/lib/observability";
import { isWaitlistEnabled } from "@/lib/flags";
import { normalizeAccessStatus } from "@/lib/user-access-status";

export const dynamic = "force-dynamic";

type SignInBody = {
  email?: string;
  password?: string;
  captchaToken?: string;
};

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export async function POST(req: Request) {
  try {
    const headers = req.headers;
    const ip = getClientIpFromRequest({ headers });
    const body = (await req.json().catch(() => ({}))) as SignInBody;
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);

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
      const { data: waitlistRow, error: waitlistError } = await admin
        .from("registration_requests")
        .select("status, role")
        .eq("email", email)
        .maybeSingle();
      if (waitlistError) {
        console.error("[auth/signin] waitlist lookup failed:", waitlistError.message, waitlistError.details);
        return jsonError("Could not verify your waitlist status. Please try again.", 500);
      }
      if (waitlistRow?.status === "rejected") {
        await registerAuthFailure(lockKey);
        return jsonError(
          "This email was rejected from the waitlist and cannot sign in. Please contact support@mentrixa.one if you believe this is a mistake.",
          403,
          { waitlistStatus: "rejected" }
        );
      }
      if (waitlistRow?.status === "pending") {
        await registerAuthFailure(lockKey);
        return jsonError(
          `This email is still on the waitlist as a ${waitlistRow.role === "tutor" ? "Guide" : "Mentrixer"}. Please wait for approval before signing in.`,
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
        return jsonError(
          "Email not registered. Please join the waitlist to get access.",
          401
        );
      }

      // Generic error for other cases
      return jsonError("Incorrect email or password. Please try again.", 401);
    }

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

    const accessStatus = normalizeAccessStatus(userData);
    if (accessStatus === "suspended") {
      await clearAuthFailures(lockKey);
      return NextResponse.json({ ok: true, redirectTo: "/suspended" });
    }

    if (accessStatus !== "approved") {
      await clearAuthFailures(lockKey);
      return NextResponse.json({ ok: true, redirectTo: "/pending-approval" });
    }

    await clearAuthFailures(lockKey);
    const redirectTo = getRoleHomePath(userData.role);
    return NextResponse.json({ ok: true, redirectTo });
  } catch (error) {
    return jsonError(sanitizeError(error), 400);
  }
}


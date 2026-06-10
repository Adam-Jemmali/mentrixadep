import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { RATE_LIMITS, checkSlidingWindowRateLimit, getClientIpFromRequest, sanitizeError, validateEmail, validatePassword } from "@/shared/core/security";
import { compositeRateKey, emailRateKey, ipRateKey } from "@/shared/core/security/auth-abuse";
import { reportSecurityRateLimitDenied } from "@/shared/integrations/observability";
import { isDisposableEmail } from "@/shared/core/disposable-email";
import { isWaitlistEnabled } from "@/shared/core/flags";
import { fetchRegistrationRequestRow } from "@/features/registration/registration-request-lookup";
import { getSiteUrl } from "@/shared/core/site";
import { findAuthUserByEmail, isGoogleOnlyAuthUser } from "@/shared/core/auth-user-lookup";
import { syncApprovedWaitlistToUserProfile } from "@/features/registration/waitlist-user-sync";

export const dynamic = "force-dynamic";

type Role = "student" | "tutor";
type SignUpBody = {
  email?: string;
  password?: string;
  role?: Role;
  ageConfirmed?: boolean;
  requestActivation?: boolean;
};

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export async function POST(req: Request) {
  try {
    const ip = getClientIpFromRequest({ headers: req.headers });
    const body = (await req.json().catch(() => ({}))) as SignUpBody;
    const email = validateEmail(body.email);
    if (isDisposableEmail(email)) return jsonError("Temporary email addresses are not allowed. Please use a real email.", 400);
    const role: Role = body.role === "tutor" ? "tutor" : "student";
    if (!body.ageConfirmed) return jsonError("Please confirm you are 13 years old or older.");
    const requestActivation = body.requestActivation === true;

    const ipLimit = await checkSlidingWindowRateLimit(ipRateKey(ip), RATE_LIMITS.signUpIpBurst.maxRequests, RATE_LIMITS.signUpIpBurst.windowMs);
    if (!ipLimit.allowed) {
      reportSecurityRateLimitDenied({ scope: "auth.signup.ip", retryAfterSeconds: ipLimit.retryAfterSeconds });
      return jsonError("Too many signup attempts. Please wait and try again.", 429, { retryAfterSeconds: ipLimit.retryAfterSeconds });
    }
    const emailLimit = await checkSlidingWindowRateLimit(emailRateKey(email), RATE_LIMITS.signUpEmailBurst.maxRequests, RATE_LIMITS.signUpEmailBurst.windowMs);
    if (!emailLimit.allowed) {
      reportSecurityRateLimitDenied({ scope: "auth.signup.email", retryAfterSeconds: emailLimit.retryAfterSeconds });
      return jsonError("Too many signup attempts. Please wait and try again.", 429, { retryAfterSeconds: emailLimit.retryAfterSeconds });
    }
    const comboLimit = await checkSlidingWindowRateLimit(compositeRateKey(ip, email), RATE_LIMITS.signUp.maxRequests, RATE_LIMITS.signUp.windowMs);
    if (!comboLimit.allowed) {
      reportSecurityRateLimitDenied({ scope: "auth.signup.ip_email", retryAfterSeconds: comboLimit.retryAfterSeconds });
      return jsonError("Too many signup attempts. Please wait and try again.", 429, { retryAfterSeconds: comboLimit.retryAfterSeconds });
    }

    if (isWaitlistEnabled()) {
      const admin = createAdminClient();
      const reqRow = await fetchRegistrationRequestRow(admin, email);
      if (reqRow?.status === "rejected") {
        return jsonError(
          "Your access request was not approved. Please contact support@mentrixa.one if this seems incorrect.",
          403,
          { waitlistStatus: "rejected" }
        );
      }
      if (reqRow?.status === "pending") {
        if (reqRow.role && reqRow.role !== role) {
          return jsonError(
            `This email already has a pending ${reqRow.role === "tutor" ? "Guide" : "Mentrixer"} onboarding request. You cannot sign up as a different role until review is complete.`,
            403,
            { waitlistStatus: "pending" }
          );
        }
        return jsonError(
          "You already have a pending onboarding request. Please wait for admin approval before signing up.",
          403,
          { waitlistStatus: "pending" }
        );
      }
      if (!reqRow || reqRow.status !== "approved") {
        return jsonError(
          "Start onboarding with your email first, then complete signup after approval.",
          403,
          { waitlistStatus: "missing" }
        );
      }
      if (reqRow.role && reqRow.role !== role) {
        return jsonError(
          `This email is already approved as a ${reqRow.role === "tutor" ? "Guide" : "Mentrixer"}. You must sign up with the same role or contact support@mentrixa.one if this is incorrect.`,
          403,
          { waitlistStatus: "approved" }
        );
      }
    }

    const supabase = await createClient();
    const admin = createAdminClient();

    if (requestActivation) {
      const nextPath = `/auth/activate?email=${encodeURIComponent(email)}&role=${role}`;
      const emailRedirectTo = `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
          shouldCreateUser: true,
        },
      });
      if (otpError) {
        return jsonError(sanitizeError(otpError), 400);
      }
      return NextResponse.json({
        ok: true,
        sessionEstablished: false,
        message: "Activation link sent.",
      });
    }

    const store = await cookies();
    const refCookie = (() => {
      const v = (store.get("mentrixa_ref")?.value ?? "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8);
      return v.length === 8 ? v : undefined;
    })();

    const password = validatePassword(body.password);
    const userMetadata = {
      role,
      age_confirmed_13_or_older: true,
      ...(refCookie ? { referral_code: refCookie } : {}),
    };
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();

    if (sessionUser && (sessionUser.email ?? "").toLowerCase() === email) {
      const { error: updError } = await admin.auth.admin.updateUserById(sessionUser.id, {
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });
      if (updError) {
        return jsonError(sanitizeError(updError), 400);
      }
    } else {
      const createRes = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });

      if (createRes.error) {
        const msg = sanitizeError(createRes.error);
        const duplicateLike =
          msg.toLowerCase().includes("already") ||
          msg.toLowerCase().includes("exists") ||
          msg.toLowerCase().includes("registered");
        if (!duplicateLike) {
          return jsonError(msg, 400);
        }
        const existing = await findAuthUserByEmail(email);
        if (existing && isGoogleOnlyAuthUser(existing)) {
          return jsonError(
            "This email uses Google sign-in. Use Google on the activation page instead of a password.",
            400,
          );
        }
      }
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return jsonError(sanitizeError(signInError), 400);

    if (signInData.user?.id) {
      await syncApprovedWaitlistToUserProfile(signInData.user.id, signInData.user.email ?? email);
    }

    return NextResponse.json({
      ok: true,
      email: signInData.user?.email ?? email,
      sessionEstablished: !!signInData.session,
      message: "Account created successfully.",
    });
  } catch (error) {
    return jsonError(sanitizeError(error), 400);
  }
}


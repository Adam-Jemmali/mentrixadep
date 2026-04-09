import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RATE_LIMITS, checkSlidingWindowRateLimit, getClientIpFromRequest, sanitizeError, validateEmail, validatePassword } from "@/lib/security";
import { compositeRateKey, emailRateKey, ipRateKey } from "@/lib/security/auth-abuse";
import { reportSecurityRateLimitDenied } from "@/lib/observability";
import { isDisposableEmail } from "@/lib/disposable-email";

export const dynamic = "force-dynamic";

type Role = "student" | "tutor";
type SignUpBody = {
  email?: string;
  password?: string;
  role?: Role;
  ageConfirmed?: boolean;
};

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export async function POST(req: Request) {
  try {
    const ip = getClientIpFromRequest({ headers: req.headers });
    const body = (await req.json().catch(() => ({}))) as SignUpBody;
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);
    if (isDisposableEmail(email)) return jsonError("Temporary email addresses are not allowed. Please use a real email.", 400);
    const role: Role = body.role === "tutor" ? "tutor" : "student";
    if (!body.ageConfirmed) return jsonError("Please confirm you are 13 years old or older.");

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

    const admin = createAdminClient();
    const { data: reqRow } = await admin
      .from("registration_requests")
      .select("status")
      .eq("email", email)
      .maybeSingle();
    if (reqRow?.status !== "approved") {
      // Generic message reduces waitlist-state enumeration.
      return jsonError("Your account is not ready for signup yet. Check your invitation approval status.", 403);
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

    const supabase = await createClient();
    const origin = new URL(req.url).origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          age_confirmed_13_or_older: true,
          ...(refCookie ? { referral_code: refCookie } : {}),
        },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) return jsonError(sanitizeError(error), 400);

    return NextResponse.json({
      ok: true,
      email: data.user?.email ?? email,
      sessionEstablished: !!data.session,
      message: "Please check your email to confirm your account.",
    });
  } catch (error) {
    return jsonError(sanitizeError(error), 400);
  }
}


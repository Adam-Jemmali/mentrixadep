import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RATE_LIMITS, checkSlidingWindowRateLimit, getClientIpFromRequest, sanitizeError, validateEmail, validatePassword } from "@/lib/security";
import { compositeRateKey, emailRateKey, ipRateKey } from "@/lib/security/auth-abuse";
import { reportSecurityRateLimitDenied } from "@/lib/observability";
import { isDisposableEmail } from "@/lib/disposable-email";
import { isWaitlistEnabled } from "@/lib/flags";

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

    if (isWaitlistEnabled()) {
      const admin = createAdminClient();
      const { data: reqRow, error: reqErr } = await admin
        .from("registration_requests")
        .select("status, role")
        .eq("email", email)
        .maybeSingle();
      if (reqErr) {
        console.error("[auth/signup] registration status lookup failed:", reqErr.message, reqErr.details);
        return jsonError("Could not verify your waitlist status right now. Please try again.", 500);
      }
      if (reqRow?.status === "rejected") {
        return jsonError(
          "Your waitlist application was rejected. Please contact support@mentrixa.one if this seems incorrect.",
          403,
          { waitlistStatus: "rejected" }
        );
      }
      if (reqRow?.status === "pending") {
        if (reqRow.role && reqRow.role !== role) {
          return jsonError(
            `This email is already on the waitlist as a ${reqRow.role === "tutor" ? "Guide" : "Mentrixer"}. You cannot sign up as a different role until that waitlist request is approved.`,
            403,
            { waitlistStatus: "pending" }
          );
        }
        return jsonError(
          "You have already applied to the waitlist. Please wait for admin approval before signing up.",
          403,
          { waitlistStatus: "pending" }
        );
      }
      if (!reqRow || reqRow.status !== "approved") {
        return jsonError(
          "Join the waitlist first using your email, then complete signup after approval.",
          403,
          { waitlistStatus: "missing" }
        );
      }
      if (reqRow.role && reqRow.role !== role) {
        return jsonError(
          `This email is already approved on the waitlist as a ${reqRow.role === "tutor" ? "Guide" : "Mentrixer"}. You must sign up with the same role or contact support@mentrixa.one if this is incorrect.`,
          403,
          { waitlistStatus: "approved" }
        );
      }
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


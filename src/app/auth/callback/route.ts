import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveOAuthSessionRedirect } from "@/app/actions/auth";
import { syncApprovedWaitlistToUserProfile } from "@/lib/waitlist-user-sync";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";

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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpTypeParam = requestUrl.searchParams.get("type");
  const nextParam = requestUrl.searchParams.get("next");
  const nextPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;

  const supabase = await createClient();

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
      redirect("/auth/signin?signin=1&error=oauth");
    }

    {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();
      if (sessionUser) {
        await syncApprovedWaitlistToUserProfile(sessionUser.id, sessionUser.email);
      }
    }

    // Password reset — go directly to reset page to preserve the recovery session.
    // Do NOT call resolveOAuthSessionRedirect which would sign out unapproved users.
    if (otpTypeParam === "recovery") {
      redirect(nextPath ?? "/auth/reset-password");
    }

    if (nextPath) {
      redirect(nextPath);
    }

    if (otpTypeParam === "signup" || otpTypeParam === "email") {
      const path = await resolvePostAuthDestination();
      redirect(path);
    }

    try {
      const path = await resolveOAuthSessionRedirect();
      redirect(path);
    } catch (e) {
      console.error("[auth/callback] resolveOAuthSessionRedirect:", e);
      redirect("/auth/signin?signin=1&error=oauth");
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
      redirect("/auth/signin?signin=1&error=confirm");
    }

    {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();
      if (sessionUser) {
        await syncApprovedWaitlistToUserProfile(sessionUser.id, sessionUser.email);
      }
    }

    // Password reset via token_hash — go directly to reset page
    if (otpTypeParam === "recovery") {
      redirect(nextPath ?? "/auth/reset-password");
    }

    if (nextPath) {
      redirect(nextPath);
    }

    if (otpTypeParam === "signup" || otpTypeParam === "email") {
      const path = await resolvePostAuthDestination();
      redirect(path);
    }

    try {
      const path = await resolveOAuthSessionRedirect();
      redirect(path);
    } catch (e) {
      console.error("[auth/callback] resolveOAuthSessionRedirect:", e);
      redirect("/auth/signin?signin=1&error=confirm");
    }
  }

  const fallback = await resolvePostAuthDestination();
  redirect(fallback);
}


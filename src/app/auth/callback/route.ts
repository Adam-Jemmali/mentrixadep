import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveOAuthSessionRedirect } from "@/app/actions/auth";

const OTP_TYPES = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession:", error.message);
      redirect("/auth/signin?error=oauth");
    }

    try {
      const path = await resolveOAuthSessionRedirect();
      redirect(path);
    } catch (e) {
      console.error("[auth/callback] resolveOAuthSessionRedirect:", e);
      redirect("/auth/signin?error=oauth");
    }
  }

  if (tokenHash && otpType && OTP_TYPES.has(otpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (error) {
      console.error("[auth/callback] verifyOtp:", error.message);
      redirect("/auth/signin?error=confirm");
    }

    try {
      const path = await resolveOAuthSessionRedirect();
      redirect(path);
    } catch (e) {
      console.error("[auth/callback] resolveOAuthSessionRedirect:", e);
      redirect("/auth/signin?error=confirm");
    }
  }

  redirect("/auth/signin?error=callback");
}

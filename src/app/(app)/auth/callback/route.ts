import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveOAuthSessionRedirect } from "@/app/actions/auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
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

  redirect("/auth/signin");
}

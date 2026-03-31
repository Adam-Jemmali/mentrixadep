import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRoleHomePath } from "@/lib/role-home";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Check if this user already has a role set in the users table
      const { data: userData } = await supabase
        .from("users")
        .select("role, approved")
        .eq("id", user.id)
        .maybeSingle();

      // New OAuth user — role not chosen yet (trigger defaults to 'student' but
      // raw_user_meta_data won't have a role key for OAuth signups)
      const hasChosenRole = user.user_metadata?.role != null;

      if (!hasChosenRole && userData?.role === "student") {
        // Could be a brand-new OAuth user who was auto-assigned student by the trigger.
        // Check if the user's metadata has no explicit role — send them to select-role.
        // We detect "new" by checking if no explicit role was set in metadata.
        redirect("/auth/select-role");
      }

      // Returning user — send to their dashboard
      if (!userData?.approved) {
        redirect("/pending-approval");
      }

      const role = userData?.role ?? user.user_metadata?.role;
      redirect(getRoleHomePath(role));
    }
  }

  redirect("/auth/signin");
}


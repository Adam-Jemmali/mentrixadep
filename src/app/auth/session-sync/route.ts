import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "@/lib/role-home";
import { normalizeAccessStatus } from "@/lib/user-access-status";
import { syncApprovedWaitlistToUserProfile } from "@/lib/waitlist-user-sync";

/**
 * After password signup when Supabase returns an immediate session (no email confirm step),
 * clients land here so we can promote waitlist-approved users before middleware runs.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  await syncApprovedWaitlistToUserProfile(user.id, user.email);

  const { data: userRow } = await supabase
    .from("users")
    .select("role, status, approved, is_blacklisted")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow?.role) {
    redirect("/auth/select-role");
  }

  const accessStatus = normalizeAccessStatus(userRow);
  if (accessStatus === "suspended") {
    redirect("/suspended");
  }
  if (accessStatus !== "approved") {
    redirect("/pending-approval");
  }

  redirect(getRoleHomePath(userRow.role));
}

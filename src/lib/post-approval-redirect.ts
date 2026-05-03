import type { UserRole } from "@/lib/database.types";
import { getRoleHomePath } from "@/lib/role-home";
import { createClient } from "@/lib/supabase/server";

/**
 * Route brand-new approved students into their first quest.
 * Everyone else keeps the normal role home path.
 */
export async function getPostApprovalRedirectPath(params: {
  userId: string;
  role: UserRole | string;
}): Promise<string> {
  const normalizedRole =
    typeof params.role === "string" ? params.role.trim().toLowerCase() : params.role;
  const basePath = getRoleHomePath(normalizedRole);
  if (normalizedRole === "tutor") {
    return "/tutor?onboarding=true";
  }
  if (normalizedRole !== "student") {
    return basePath;
  }

  const supabase = await createClient();

  const [sessionsRes, questsRes] = await Promise.all([
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", params.userId)
      .eq("status", "completed"),
    supabase
      .from("user_quest_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", params.userId)
      .eq("status", "completed"),
  ]);

  if (sessionsRes.error || questsRes.error) {
    console.error("[post-approval-redirect] count query failed", {
      sessionsError: sessionsRes.error?.message,
      questsError: questsRes.error?.message,
    });
    return basePath;
  }

  const completedSessions = sessionsRes.count ?? 0;
  const completedQuests = questsRes.count ?? 0;

  if (completedSessions === 0 && completedQuests === 0) {
    return "/student?onboarding=true";
  }

  return basePath;
}

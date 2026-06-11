import type { UserRole } from "@/shared/types/database";
import { getRoleHomePath } from "@/shared/core/role-home";
import { createClient } from "@/shared/integrations/supabase/server";

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

  const { count, error } = await supabase
    .from("user_quest_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", params.userId)
    .eq("status", "completed");

  if (error) {
    console.error("[post-approval-redirect] quest count query failed", {
      questsError: error.message,
    });
    return basePath;
  }

  const completedQuests = count ?? 0;
  if (completedQuests === 0) {
    return "/student/quest?onboarding=true";
  }

  return basePath;
}

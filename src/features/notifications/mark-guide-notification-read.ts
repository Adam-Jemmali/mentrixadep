"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { validateUUID } from "@/shared/core/security";

export async function markGuideNotificationRead(
  notificationId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole(["tutor", "admin"]);
  let validId: string;
  try {
    validId = validateUUID(notificationId);
  } catch {
    return { success: false, error: "Invalid notification." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", validId)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

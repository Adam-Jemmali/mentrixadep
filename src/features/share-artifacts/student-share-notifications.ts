"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";

export type StudentShareNotification = {
  id: string;
  body: string;
  href: string | null;
  createdAt: string;
};

export async function loadStudentShareNotifications(
  limit = 3,
): Promise<StudentShareNotification[]> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_notifications")
    .select("id, body, href, created_at")
    .eq("user_id", user.id)
    .eq("kind", "share_before_after")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[loadStudentShareNotifications]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    body: String(row.body),
    href: typeof row.href === "string" ? row.href : null,
    createdAt: String(row.created_at),
  }));
}

export async function markStudentShareNotificationRead(
  notificationId: string,
): Promise<void> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  await admin
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .eq("kind", "share_before_after");
}

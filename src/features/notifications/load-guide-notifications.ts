"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";

export type GuideNotificationEntry = {
  id: string;
  body: string;
  href: string | null;
  createdAt: string;
  readAt: string | null;
};

export async function loadGuideNotifications(
  guideId: string,
  limit = 12,
): Promise<GuideNotificationEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_notifications")
    .select("id, body, href, created_at, read_at")
    .eq("user_id", guideId)
    .eq("kind", "intervention_retest_complete")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[loadGuideNotifications]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    body: String(row.body),
    href: typeof row.href === "string" ? row.href : null,
    createdAt: String(row.created_at),
    readAt: row.read_at ? String(row.read_at) : null,
  }));
}

export async function countUnreadGuideNotifications(guideId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", guideId)
    .eq("kind", "intervention_retest_complete")
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}

export async function fetchGuideNotificationsForViewer(): Promise<GuideNotificationEntry[]> {
  const user = await requireRole(["tutor", "admin"]);
  return loadGuideNotifications(user.id);
}

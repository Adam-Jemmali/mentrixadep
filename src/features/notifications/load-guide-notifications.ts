"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { resolveGuideRetestNotificationTone } from "@/features/notifications/guide-retest-notification-copy-pure";
import type { RetestNotificationTone } from "@/features/notifications/notification-card-pure";
import { buildGuideRetestViewStudentHref } from "@/features/notifications/notification-card-pure";

export type GuideNotificationEntry = {
  id: string;
  body: string;
  href: string | null;
  createdAt: string;
  readAt: string | null;
  tone: RetestNotificationTone;
  studentName: string | null;
};

export async function loadGuideNotifications(
  guideId: string,
  limit = 12,
): Promise<GuideNotificationEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_notifications")
    .select("id, body, href, created_at, read_at, source_id")
    .eq("user_id", guideId)
    .eq("kind", "intervention_retest_complete")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[loadGuideNotifications]", error.message);
    return [];
  }

  const retestIds = (data ?? [])
    .map((row) => (row.source_id ? String(row.source_id) : null))
    .filter((id): id is string => Boolean(id));

  const { data: retests } = retestIds.length
    ? await admin
        .from("intervention_retests")
        .select("id, delta, pre_accuracy, post_accuracy, source_id, user_id, skill_node_id")
        .in("id", retestIds)
    : { data: [] as const };

  const retestById = new Map((retests ?? []).map((row) => [String(row.id), row]));

  const studentIds = [
    ...new Set(
      (retests ?? [])
        .map((row) => (row.user_id ? String(row.user_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: settings } = studentIds.length
    ? await admin.from("user_settings").select("user_id, display_name").in("user_id", studentIds)
    : { data: [] as const };

  const nameByStudent = new Map(
    (settings ?? []).map((row) => [String(row.user_id), String(row.display_name ?? "").trim()]),
  );

  return (data ?? []).map((row) => {
    const retest = row.source_id ? retestById.get(String(row.source_id)) : null;
    const delta = Number(retest?.delta ?? 0);
    const tone = resolveGuideRetestNotificationTone(delta);
    const sessionId = retest?.source_id ? String(retest.source_id) : null;
    const href =
      typeof row.href === "string" && row.href.trim()
        ? row.href
        : sessionId
          ? buildGuideRetestViewStudentHref(sessionId)
          : null;
    const studentName = retest?.user_id
      ? nameByStudent.get(String(retest.user_id)) || null
      : null;

    return {
      id: String(row.id),
      body: String(row.body),
      href,
      createdAt: String(row.created_at),
      readAt: row.read_at ? String(row.read_at) : null,
      tone,
      studentName,
    };
  });
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

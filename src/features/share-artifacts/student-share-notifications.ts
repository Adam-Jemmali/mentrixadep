"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";

export type StudentShareNotification = {
  id: string;
  body: string;
  href: string | null;
  createdAt: string;
};

export type StudentShareProofNotification = {
  id: string;
  href: string | null;
  nodeName: string;
  beforeAccuracy: number;
  afterAccuracy: number;
  guideName: string | null;
  createdAt: string;
  rankUsername: string | null;
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

/** Loads proof card fields for inline student notification rendering. */
export async function loadStudentShareProofNotifications(
  limit = 1,
): Promise<StudentShareProofNotification[]> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("user_notifications")
    .select("id, href, created_at, source_id")
    .eq("user_id", user.id)
    .eq("kind", "share_before_after")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) {
    if (error) console.error("[loadStudentShareProofNotifications]", error.message);
    return [];
  }

  const artifactIds = rows
    .map((row) => (row.source_id ? String(row.source_id) : null))
    .filter((id): id is string => Boolean(id));

  const [{ data: artifacts }, { data: settings }] = await Promise.all([
    artifactIds.length
      ? admin
          .from("share_artifacts")
          .select("id, node_name, before_value, after_value, guide_name")
          .in("id", artifactIds)
      : Promise.resolve({ data: [] as const }),
    admin
      .from("user_settings")
      .select("rank_card_username")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const artifactById = new Map(
    (artifacts ?? []).map((row) => [String(row.id), row]),
  );
  const rankUsername =
    typeof settings?.rank_card_username === "string" &&
    settings.rank_card_username.trim()
      ? settings.rank_card_username.trim()
      : null;

  return rows
    .map((row) => {
      const artifact = row.source_id ? artifactById.get(String(row.source_id)) : null;
      if (!artifact) return null;

      return {
        id: String(row.id),
        href: typeof row.href === "string" ? row.href : null,
        nodeName: String(artifact.node_name ?? "this skill"),
        beforeAccuracy: Number(artifact.before_value ?? 0),
        afterAccuracy: Number(artifact.after_value ?? 0),
        guideName: typeof artifact.guide_name === "string" ? artifact.guide_name : null,
        createdAt: String(row.created_at),
        rankUsername,
      };
    })
    .filter((row): row is StudentShareProofNotification => row != null);
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

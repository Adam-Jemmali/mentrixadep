"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { buildStudentRetestProofHref } from "@/features/notifications/notification-card-pure";

export type StudentRetestProofNotification = {
  id: string;
  href: string | null;
  nodeName: string;
  beforeAccuracy: number;
  afterAccuracy: number;
  guideName: string | null;
  createdAt: string;
  rankUsername: string | null;
  shareHref: string | null;
};

export async function loadStudentRetestProofNotifications(
  limit = 1,
): Promise<StudentRetestProofNotification[]> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("user_notifications")
    .select("id, href, created_at, source_id")
    .eq("user_id", user.id)
    .eq("kind", "retest_complete")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) {
    if (error) console.error("[loadStudentRetestProofNotifications]", error.message);
    return [];
  }

  const retestIds = rows
    .map((row) => (row.source_id ? String(row.source_id) : null))
    .filter((id): id is string => Boolean(id));

  const [{ data: retests }, { data: settings }, { data: shareRows }] = await Promise.all([
    retestIds.length
      ? admin
          .from("intervention_retests")
          .select("id, pre_accuracy, post_accuracy, skill_node_id, source_id, source_type")
          .in("id", retestIds)
      : Promise.resolve({ data: [] as const }),
    admin
      .from("user_settings")
      .select("rank_card_username")
      .eq("user_id", user.id)
      .maybeSingle(),
    retestIds.length
      ? admin
          .from("share_artifacts")
          .select("intervention_retest_id, share_token")
          .in("intervention_retest_id", retestIds)
      : Promise.resolve({ data: [] as const }),
  ]);

  const retestById = new Map((retests ?? []).map((row) => [String(row.id), row]));
  const shareByRetest = new Map(
    (shareRows ?? []).map((row) => [
      String(row.intervention_retest_id),
      `/share/${String(row.share_token)}`,
    ]),
  );

  const nodeIds = [
    ...new Set(
      (retests ?? [])
        .map((row) => (row.skill_node_id ? String(row.skill_node_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const sessionIds = [
    ...new Set(
      (retests ?? [])
        .filter((row) => row.source_type === "session" || row.source_type === "studio_package")
        .map((row) => (row.source_id ? String(row.source_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: nodes }, { data: sessions }] = await Promise.all([
    nodeIds.length
      ? admin.from("skill_nodes").select("id, node_name").in("id", nodeIds)
      : Promise.resolve({ data: [] as const }),
    sessionIds.length
      ? admin.from("sessions").select("id, tutor_id").in("id", sessionIds)
      : Promise.resolve({ data: [] as const }),
  ]);

  const nodeById = new Map((nodes ?? []).map((row) => [String(row.id), String(row.node_name ?? "")]));

  const tutorIds = [
    ...new Set(
      (sessions ?? [])
        .map((row) => (row.tutor_id ? String(row.tutor_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: guideSettings } = tutorIds.length
    ? await admin.from("user_settings").select("user_id, display_name").in("user_id", tutorIds)
    : { data: [] as const };

  const guideNameById = new Map(
    (guideSettings ?? []).map((row) => [String(row.user_id), String(row.display_name ?? "").trim()]),
  );
  const tutorBySession = new Map(
    (sessions ?? []).map((row) => [String(row.id), row.tutor_id ? String(row.tutor_id) : null]),
  );

  const rankUsername =
    typeof settings?.rank_card_username === "string" && settings.rank_card_username.trim()
      ? settings.rank_card_username.trim()
      : null;

  const mapped: StudentRetestProofNotification[] = [];

  for (const row of rows) {
    const retest = row.source_id ? retestById.get(String(row.source_id)) : null;
    if (!retest) continue;

    const nodeName = retest.skill_node_id
      ? nodeById.get(String(retest.skill_node_id)) || "this skill"
      : "this skill";
    const tutorId = retest.source_id ? tutorBySession.get(String(retest.source_id)) : null;
    const guideName = tutorId ? guideNameById.get(tutorId) || null : null;
    const shareHref = row.source_id ? shareByRetest.get(String(row.source_id)) ?? null : null;

    mapped.push({
      id: String(row.id),
      href: typeof row.href === "string" && row.href.trim() ? row.href : buildStudentRetestProofHref(),
      nodeName,
      beforeAccuracy: Number(retest.pre_accuracy ?? 0),
      afterAccuracy: Number(retest.post_accuracy ?? 0),
      guideName,
      createdAt: String(row.created_at),
      rankUsername,
      shareHref,
    });
  }

  return mapped;
}

export async function markStudentRetestNotificationRead(notificationId: string): Promise<void> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  await admin
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .eq("kind", "retest_complete");
}

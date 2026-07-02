import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";

export type GuideImpactReceipt = {
  guideId: string;
  guideName: string;
  nodeName: string;
  impactScore: number;
  completedAt: string;
};

export async function loadGuideImpactReceipts(
  userId: string,
  options?: { limit?: number; fullHistory?: boolean },
): Promise<GuideImpactReceipt[]> {
  const admin = createAdminClient();
  const limit = options?.limit ?? (options?.fullHistory ? 20 : 1);

  const weakNodes = await getWeakestNodes(userId, AP_CALC_AB_SUBJECT, 5);
  const weakNodeIds = new Set(weakNodes.map((node) => node.id));
  if (weakNodeIds.size === 0) return [];

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, tutor_id, end_time, status")
    .eq("student_id", userId)
    .eq("status", "completed")
    .order("end_time", { ascending: false })
    .limit(20);

  const sessionIds = (sessions ?? []).map((row) => String(row.id));
  if (sessionIds.length === 0) return [];

  const { data: targetNodes } = await admin
    .from("session_target_nodes")
    .select("session_id, skill_node_id, post_session_correct, skill_nodes(node_name)")
    .in("session_id", sessionIds)
    .eq("post_session_correct", true);

  const tutorIds = [...new Set((sessions ?? []).map((row) => String(row.tutor_id)))];
  const { data: settings } = await admin
    .from("user_settings")
    .select("user_id, display_name")
    .in("user_id", tutorIds);

  const nameByGuide = new Map(
    (settings ?? []).map((row) => [String(row.user_id), String(row.display_name ?? "Guide")]),
  );

  const { data: impactRows } = await admin
    .from("guide_impact_scores")
    .select("guide_id, impact_score")
    .in("guide_id", tutorIds)
    .eq("subject", AP_CALC_AB_SUBJECT);

  const impactByGuide = new Map(
    (impactRows ?? []).map((row) => [String(row.guide_id), Number(row.impact_score)]),
  );

  const endTimeBySession = new Map(
    (sessions ?? []).map((row) => [String(row.id), String(row.end_time)]),
  );
  const tutorBySession = new Map(
    (sessions ?? []).map((row) => [String(row.id), String(row.tutor_id)]),
  );

  const receipts: GuideImpactReceipt[] = [];
  for (const row of targetNodes ?? []) {
    const nodeId = String(row.skill_node_id);
    if (!weakNodeIds.has(nodeId)) continue;
    const sessionId = String(row.session_id);
    const guideId = tutorBySession.get(sessionId);
    if (!guideId) continue;
    const skillNodes = row.skill_nodes as { node_name?: string } | { node_name?: string }[] | null;
    const nodeName = Array.isArray(skillNodes)
      ? skillNodes[0]?.node_name
      : skillNodes?.node_name;
    receipts.push({
      guideId,
      guideName: nameByGuide.get(guideId) ?? "Guide",
      nodeName: nodeName ?? "Skill node",
      impactScore: impactByGuide.get(guideId) ?? 0,
      completedAt: endTimeBySession.get(sessionId) ?? new Date().toISOString(),
    });
  }

  return receipts
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, limit);
}

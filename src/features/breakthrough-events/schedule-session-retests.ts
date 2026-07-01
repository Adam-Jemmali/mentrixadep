import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { seedSessionTargetNodes } from "@/features/breakthrough-events/seed-session-target-nodes";
import { loadVerifiedFirstAttemptMap } from "@/features/pre-session-brief/verified-gaps";
import {
  addStudioRetestDelay,
  resolveCoveredSkillNodeIds,
  type SkillNodeTopicRef,
} from "@/features/breakthrough-events/schedule-session-retests-pure";
import { scheduleStudioPackageRetests } from "@/features/intervention-retests/schedule-intervention-retests";
import { AP_CALC_AB_SUBJECT, isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

export type StudioRetestScheduleResult = {
  retestScheduledAt: string;
  skillsCovered: number;
};

export async function scheduleSessionRetestsOnPublish(params: {
  sessionId: string;
  studentId: string;
  course: string;
  publishedAt: string;
  followUpTopics: string[];
}): Promise<StudioRetestScheduleResult | null> {
  if (!isApCalculusAbSubject(params.course)) return null;

  const admin = createAdminClient();
  await seedSessionTargetNodes(params.sessionId, params.studentId, params.course);

  const [{ data: targetRows }, { data: skillNodes }] = await Promise.all([
    admin
      .from("session_target_nodes")
      .select("skill_node_id")
      .eq("session_id", params.sessionId),
    admin
      .from("skill_nodes")
      .select("id, node_name, node_slug")
      .eq("subject", AP_CALC_AB_SUBJECT),
  ]);

  const coveredNodeIds = resolveCoveredSkillNodeIds(
    (targetRows ?? []).map((row) => String(row.skill_node_id)),
    params.followUpTopics,
    (skillNodes ?? []) as SkillNodeTopicRef[],
  );

  if (coveredNodeIds.length === 0) return null;

  const publishedAt = new Date(params.publishedAt);
  const retestScheduledAt = addStudioRetestDelay(publishedAt).toISOString();
  const verifiedByNode = await loadVerifiedFirstAttemptMap(params.studentId, coveredNodeIds);

  let legacyScheduledCount = 0;
  for (const skillNodeId of coveredNodeIds) {
    const { data: existing } = await admin
      .from("session_target_nodes")
      .select("id, post_session_checked_at")
      .eq("session_id", params.sessionId)
      .eq("skill_node_id", skillNodeId)
      .maybeSingle();

    if (existing?.post_session_checked_at) continue;

    if (existing) {
      const { error } = await admin
        .from("session_target_nodes")
        .update({ retest_scheduled_at: retestScheduledAt })
        .eq("id", existing.id)
        .is("post_session_checked_at", null);

      if (!error) legacyScheduledCount += 1;
      continue;
    }

    const { error } = await admin.from("session_target_nodes").insert({
      session_id: params.sessionId,
      skill_node_id: skillNodeId,
      pre_session_correct: verifiedByNode.has(skillNodeId)
        ? verifiedByNode.get(skillNodeId)!
        : null,
      retest_scheduled_at: retestScheduledAt,
    });

    if (!error) legacyScheduledCount += 1;
  }

  const interventionScheduled = await scheduleStudioPackageRetests({
    sessionId: params.sessionId,
    studentId: params.studentId,
    skillNodeIds: coveredNodeIds,
    publishedAt: params.publishedAt,
  });

  const scheduledCount = Math.max(legacyScheduledCount, interventionScheduled);
  if (scheduledCount === 0) return null;

  return {
    retestScheduledAt,
    skillsCovered: scheduledCount,
  };
}

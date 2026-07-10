import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { loadVerifiedFirstAttemptMap } from "@/features/pre-session-brief/verified-gaps";
import {
  addStudioRetestDelay,
  type SkillNodeTopicRef,
} from "@/features/breakthrough-events/schedule-session-retests-pure";
import { scheduleStudioPackageRetests } from "@/features/intervention-retests/schedule-intervention-retests";
import { AP_CALC_AB_SUBJECT, isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { resolveStudioCallCoveredNodeIds } from "@/features/studio-ai/studio-mastery-match-pure";

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
  packageSource?: {
    summary?: string | null;
    keyPoints?: string[] | null;
    practiceTitles?: string[] | null;
    flashcardQuestions?: string[] | null;
    practicePrompts?: string[] | null;
  };
}): Promise<StudioRetestScheduleResult | null> {
  if (!isApCalculusAbSubject(params.course)) return null;

  const admin = createAdminClient();

  const { data: skillNodes } = await admin
    .from("skill_nodes")
    .select("id, node_name, node_slug")
    .eq("subject", AP_CALC_AB_SUBJECT);

  const coveredNodeIds = resolveStudioCallCoveredNodeIds(
    {
      summary: params.packageSource?.summary ?? null,
      keyPoints: params.packageSource?.keyPoints ?? [],
      followUpTopics: params.followUpTopics,
      practiceTitles: params.packageSource?.practiceTitles ?? [],
      flashcardQuestions: params.packageSource?.flashcardQuestions ?? [],
      practicePrompts: params.packageSource?.practicePrompts ?? [],
    },
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

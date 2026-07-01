import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  calculateHoursToTargetReview,
  calculateMemoryStrengthBase,
  DEFAULT_COGNITIVE_FRICTION,
} from "@/features/analytics/utils/ebbinghausScheduler";
import type { KnowledgeNodeUpdate } from "@/features/learning-path/knowledge-graph-lib";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

export async function getUserCognitiveFriction(_userId: string): Promise<number> {
  return DEFAULT_COGNITIVE_FRICTION;
}

export async function scheduleApCalcReviews(
  userId: string,
  updates: KnowledgeNodeUpdate[],
  reviewedAt = new Date()
): Promise<void> {
  const correctWithSkill = updates.filter(
    (update) => update.correct && update.skillNodeId && isApCalculusAbSubject(update.subject)
  );
  if (correctWithSkill.length === 0) return;

  const admin = createAdminClient();
  const friction = await getUserCognitiveFriction(userId);

  for (const update of correctWithSkill) {
    const skillNodeId = update.skillNodeId!;
    const { data: row } = await admin
      .from("student_knowledge_nodes")
      .select("correct")
      .eq("user_id", userId)
      .eq("skill_node_id", skillNodeId)
      .maybeSingle();

    const correctCount = Number(row?.correct ?? 1);
    const baseStrength = calculateMemoryStrengthBase(correctCount);
    const hoursToReview = calculateHoursToTargetReview(baseStrength, friction);
    const nextReviewAt = new Date(
      reviewedAt.getTime() + hoursToReview * 60 * 60 * 1000
    ).toISOString();

    await admin
      .from("student_knowledge_nodes")
      .update({ next_review_at: nextReviewAt } as { next_review_at: string })
      .eq("user_id", userId)
      .eq("skill_node_id", skillNodeId);
  }
}

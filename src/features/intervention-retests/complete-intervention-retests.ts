import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { interventionRetestPostAccuracy } from "@/features/intervention-retests/complete-intervention-retests-pure";

/**
 * Close due intervention_retests for a node attempt.
 * postAccuracy is 0–100 (matches intervention_retests / guide impact).
 * Safe to call on every attempt; only open rows with scheduled_for <= now() update.
 */
export async function completeDueInterventionRetests(params: {
  userId: string;
  skillNodeId: string;
  /** 0–1 fraction or 0–100 points; values ≤ 1 are treated as fractions. */
  postAccuracy: number;
}): Promise<void> {
  const skillNodeId = params.skillNodeId.trim();
  const postAccuracy = interventionRetestPostAccuracy(params.postAccuracy);
  if (!params.userId || !skillNodeId || postAccuracy == null) {
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("complete_due_intervention_retests", {
    p_user_id: params.userId,
    p_skill_node_id: skillNodeId,
    p_post_accuracy: postAccuracy,
  });

  if (error) {
    console.error("[completeDueInterventionRetests]", error.message);
  }
}

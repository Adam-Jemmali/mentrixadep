import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { loadVerifiedFirstAttemptMap } from "@/features/pre-session-brief/verified-gaps";
import { AP_CALC_AB_SUBJECT, isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

export async function seedSessionTargetNodes(
  sessionId: string,
  studentId: string,
  course: string
): Promise<void> {
  if (!isApCalculusAbSubject(course)) return;

  const admin = createAdminClient();
  const weakest = await getWeakestNodes(studentId, AP_CALC_AB_SUBJECT, 3);
  if (weakest.length === 0) return;

  const { data: existing } = await admin
    .from("session_target_nodes")
    .select("id")
    .eq("session_id", sessionId)
    .limit(1);

  if (existing?.length) return;

  const verifiedByNode = await loadVerifiedFirstAttemptMap(
    studentId,
    weakest.map((node) => node.id)
  );

  const rows = weakest.map((node) => ({
    session_id: sessionId,
    skill_node_id: node.id,
    pre_session_correct: verifiedByNode.has(node.id)
      ? verifiedByNode.get(node.id)!
      : null,
  }));

  const { error } = await admin.from("session_target_nodes").insert(rows);
  if (error) {
    console.error("[seedSessionTargetNodes] insert failed:", error.message);
  }
}

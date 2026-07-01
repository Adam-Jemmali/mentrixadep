import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { AP_CALC_AB_SUBJECT, isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import type { VerifiedGapsSummary } from "@/features/pre-session-brief/types";

export type VerifiedGapNodeInput = {
  unitName: string;
  nodeName: string;
  verifiedFirstAttempt: boolean | null;
  attemptsCount: number;
  correctCount: number;
};

export function formatVerifiedGapLine(gap: VerifiedGapNodeInput): string {
  const base = `${gap.unitName}, ${gap.nodeName}`;
  const practice = `practice ${gap.correctCount} of ${gap.attemptsCount}`;
  if (gap.verifiedFirstAttempt === null) {
    return `${base}: ${practice}`;
  }
  const verified = gap.verifiedFirstAttempt ? "correct" : "incorrect";
  return `${base}: verified first attempt ${verified}, ${practice}`;
}

export async function loadVerifiedFirstAttemptMap(
  userId: string,
  skillNodeIds: string[]
): Promise<Map<string, boolean>> {
  if (skillNodeIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data } = await admin
    .from("verified_first_attempts")
    .select("skill_node_id, is_correct")
    .eq("user_id", userId)
    .in("skill_node_id", skillNodeIds);

  const map = new Map<string, boolean>();
  for (const row of data ?? []) {
    if (row.skill_node_id) {
      map.set(row.skill_node_id, Boolean(row.is_correct));
    }
  }
  return map;
}

export async function loadVerifiedGaps(
  studentId: string,
  subject: string,
  limit = 3
): Promise<VerifiedGapsSummary | null> {
  if (!isApCalculusAbSubject(subject)) return null;

  const weakest = await getWeakestNodes(studentId, AP_CALC_AB_SUBJECT, limit);
  if (weakest.length === 0) return null;

  const verifiedByNode = await loadVerifiedFirstAttemptMap(
    studentId,
    weakest.map((node) => node.id)
  );
  return {
    nodes: weakest.map((node) => ({
      unitName: node.unitName,
      nodeName: node.nodeName,
      verifiedFirstAttempt: verifiedByNode.has(node.id)
        ? verifiedByNode.get(node.id)!
        : null,
      attemptsCount: node.attemptsCount,
      correctCount: node.correctCount,
    })),
  };
}

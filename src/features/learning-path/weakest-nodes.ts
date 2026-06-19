import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  AP_CALC_AB_SUBJECT,
  isApCalculusAbSubject,
} from "@/features/quest/ap-calc-ab-subject";

export type WeakestSkillNode = {
  id: string;
  subject: string;
  unitNumber: number;
  unitName: string;
  nodeName: string;
  nodeSlug: string;
  displayOrder: number;
  accuracyRatio: number;
  attemptsCount: number;
  correctCount: number;
};

function mapWeakestRow(row: Record<string, unknown>): WeakestSkillNode {
  return {
    id: String(row.id),
    subject: String(row.subject),
    unitNumber: Number(row.unit_number),
    unitName: String(row.unit_name),
    nodeName: String(row.node_name),
    nodeSlug: String(row.node_slug),
    displayOrder: Number(row.display_order),
    accuracyRatio: Number(row.accuracy_ratio),
    attemptsCount: Number(row.attempts_count),
    correctCount: Number(row.correct_count),
  };
}

export async function getWeakestNodes(
  userId: string,
  subject: string,
  limit = 10
): Promise<WeakestSkillNode[]> {
  if (!isApCalculusAbSubject(subject)) return [];

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_weakest_nodes", {
    p_user_id: userId,
    p_subject: AP_CALC_AB_SUBJECT,
    p_limit: limit,
  });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapWeakestRow(row as Record<string, unknown>));
}

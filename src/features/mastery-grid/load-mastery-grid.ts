"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  buildMasteryGridNextAction,
  groupSkillNodesIntoUnits,
  resolveMasteryNodeState,
} from "@/features/mastery-grid/mastery-grid-pure";
import type { MasteryGridData } from "@/features/mastery-grid/types";

type SkillNodeRow = {
  id: string;
  unit_number: number;
  unit_name: string;
  node_name: string;
  node_slug: string;
  display_order: number;
};

export async function loadMasteryGrid(userId: string): Promise<MasteryGridData> {
  const admin = createAdminClient();

  const { data: skillNodes, error: nodesError } = await admin
    .from("skill_nodes")
    .select("id, unit_number, unit_name, node_name, node_slug, display_order")
    .eq("subject", AP_CALC_AB_SUBJECT)
    .order("display_order");

  if (nodesError) throw new Error(nodesError.message);

  const nodeIds = (skillNodes ?? []).map((node) => node.id);

  const [verifiedResult, knowledgeResult] = await Promise.all([
    nodeIds.length > 0
      ? admin
          .from("verified_first_attempts")
          .select("skill_node_id, is_correct")
          .eq("user_id", userId)
          .in("skill_node_id", nodeIds)
      : Promise.resolve({ data: [], error: null }),
    nodeIds.length > 0
      ? admin
          .from("student_knowledge_nodes")
          .select("skill_node_id, attempts, correct")
          .eq("user_id", userId)
          .eq("subject", AP_CALC_AB_SUBJECT)
          .in("skill_node_id", nodeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (verifiedResult.error) throw new Error(verifiedResult.error.message);
  if (knowledgeResult.error) throw new Error(knowledgeResult.error.message);

  const verifiedByNode = new Map<string, { isCorrect: boolean }>();
  for (const row of verifiedResult.data ?? []) {
    verifiedByNode.set(row.skill_node_id, { isCorrect: row.is_correct });
  }

  const knowledgeByNode = new Map<string, { attempts: number; correct: number }>();
  for (const row of knowledgeResult.data ?? []) {
    if (!row.skill_node_id) continue;
    knowledgeByNode.set(row.skill_node_id, {
      attempts: row.attempts ?? 0,
      correct: row.correct ?? 0,
    });
  }

  const units = groupSkillNodesIntoUnits(skillNodes as SkillNodeRow[], (node) =>
    resolveMasteryNodeState(
      verifiedByNode.get(node.id) ?? null,
      knowledgeByNode.get(node.id) ?? null
    )
  );

  return {
    subject: AP_CALC_AB_SUBJECT,
    units,
    nextActionLine: buildMasteryGridNextAction(units),
  };
}

export async function getMasteryGridForCurrentUser(): Promise<MasteryGridData> {
  const user = await requireRole(["student", "admin"]);
  return loadMasteryGrid(user.id);
}

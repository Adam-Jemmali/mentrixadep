import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  parseStepTraceSequence,
  type StepTraceProblem,
} from "@/features/diagnostics/step-trace-types";

type SkillNodeJoin = {
  node_name: string;
  node_slug: string | null;
  unit_number: number;
  unit_name: string;
  exam_stakes: string | null;
  subject: string;
};

type StepTraceItemRow = {
  id: string;
  prompt: string;
  step_sequence: unknown;
  skill_node_id: string;
  skill_nodes: SkillNodeJoin | SkillNodeJoin[] | null;
};

function pickOne<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? null;
}

function resolveSkillNode(raw: StepTraceItemRow["skill_nodes"]): SkillNodeJoin | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

/**
 * Single indexed read against approved step-trace rows — no live generation.
 * Curated pool is small (15–20 items); in-memory pick keeps response time flat.
 */
export async function selectGuestStepTraceItem(): Promise<
  (StepTraceProblem & {
    unitNumber: number;
    unitName: string;
    nodeSlug?: string;
  }) | null
> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("item_bank")
    .select(
      `
      id,
      prompt,
      step_sequence,
      skill_node_id,
      skill_nodes!inner (
        node_name,
        node_slug,
        unit_number,
        unit_name,
        exam_stakes,
        subject
      )
    `,
    )
    .eq("status", "approved")
    .not("step_sequence", "is", null)
    .eq("skill_nodes.subject", AP_CALC_AB_SUBJECT);

  if (error || !data?.length) return null;

  const eligible: Array<{
    row: StepTraceItemRow;
    node: SkillNodeJoin;
    sequence: NonNullable<ReturnType<typeof parseStepTraceSequence>>;
  }> = [];

  for (const row of data as StepTraceItemRow[]) {
    const sequence = parseStepTraceSequence(row.step_sequence);
    const node = resolveSkillNode(row.skill_nodes);
    if (!sequence || !node?.node_name) continue;
    eligible.push({ row, node, sequence });
  }

  const picked = pickOne(eligible);
  if (!picked) return null;

  return {
    itemId: picked.row.id,
    prompt: picked.row.prompt,
    stepSequence: picked.sequence,
    skillNodeId: picked.row.skill_node_id,
    nodeName: picked.node.node_name,
    unitNumber: picked.node.unit_number,
    unitName: picked.node.unit_name,
    nodeSlug: picked.node.node_slug?.trim() || undefined,
    examStakes: picked.node.exam_stakes?.trim() || undefined,
  };
}

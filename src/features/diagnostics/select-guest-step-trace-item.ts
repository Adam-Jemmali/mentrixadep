import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  parseStepTraceSequence,
  type StepTraceProblem,
} from "@/features/diagnostics/step-trace-types";
import {
  pickGuestStepTraceBankEntry,
  type GuestStepTraceBankEntry,
} from "@/features/diagnostics/guest-step-trace-bank";

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

export type GuestStepTraceSelection = StepTraceProblem & {
  unitNumber: number;
  unitName: string;
  nodeSlug?: string;
};
import {
  pickDeterministicByTier,
} from "@/features/diagnostics/select-guest-step-trace-pure";
function resolveSkillNode(raw: StepTraceItemRow["skill_nodes"]): SkillNodeJoin | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

async function resolveSkillNodeIdBySlug(nodeSlug: string): Promise<string | undefined> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("skill_nodes")
    .select("id")
    .eq("subject", AP_CALC_AB_SUBJECT)
    .eq("node_slug", nodeSlug)
    .maybeSingle();

  if (error || !data?.id) return undefined;
  return data.id;
}

function bankEntryToSelection(
  entry: GuestStepTraceBankEntry,
  skillNodeId?: string,
): GuestStepTraceSelection {
  return {
    itemId: entry.itemId,
    prompt: entry.prompt,
    stepSequence: entry.stepSequence,
    skillNodeId,
    nodeName: entry.nodeName,
    unitNumber: entry.unitNumber,
    unitName: entry.unitName,
    nodeSlug: entry.nodeSlug,
    examStakes: entry.examStakes,
  };
}

async function selectFromOfflineBank(sessionSeed: string): Promise<GuestStepTraceSelection | null> {
  const entry = pickGuestStepTraceBankEntry(sessionSeed);
  if (!entry) return null;
  const skillNodeId = await resolveSkillNodeIdBySlug(entry.nodeSlug);
  return bankEntryToSelection(entry, skillNodeId);
}

/**
 * Single indexed read against approved step-trace rows — no live generation.
 * Falls back to the offline reviewed bank when item_bank.step_sequence is not seeded.
 * Selection is deterministic per sessionSeed so viral traffic does not reshuffle items.
 */
export async function selectGuestStepTraceItem(
  sessionSeed: string,
): Promise<GuestStepTraceSelection | null> {
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

  if (!error && data?.length) {
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

    const picked = pickDeterministicByTier(
      eligible.map((entry) => ({
        ...entry,
        unitNumber: entry.node.unit_number,
        nodeSlug: entry.node.node_slug,
      })),
      sessionSeed,
    );
    if (picked) {
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
  }

  return selectFromOfflineBank(sessionSeed);
}

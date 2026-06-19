"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const SUBJECT = "AP Calculus AB";

const approveEditsSchema = z
  .object({
    prompt: z.string().min(10).max(4000).optional(),
    options: z
      .tuple([
        z.string().min(1).max(500),
        z.string().min(1).max(500),
        z.string().min(1).max(500),
        z.string().min(1).max(500),
      ])
      .optional(),
    explanation: z.string().min(10).max(4000).optional(),
  })
  .optional();

const itemIdSchema = z.string().uuid();

export type ItemBankCandidate = {
  id: string;
  skill_node_id: string;
  question_type: string;
  prompt: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  distractor_tags: Record<string, string>;
  difficulty_rating: number | null;
  status: string;
  created_at: string | null;
};

export type ReviewNodeGroup = {
  skill_node_id: string;
  unit_number: number;
  unit_name: string;
  node_name: string;
  node_slug: string;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  items: ItemBankCandidate[];
};

export type ReviewNodeSummary = {
  skill_node_id: string;
  unit_number: number;
  unit_name: string;
  node_name: string;
  approved_count: number;
  below_target: boolean;
};

export type ReviewQueueStats = {
  approved: number;
  pending: number;
  rejected: number;
};

export type ReviewQueueData = {
  stats: ReviewQueueStats;
  nodeBreakdown: ReviewNodeSummary[];
  groups: ReviewNodeGroup[];
};

function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function parseDistractorTags(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, tag] of Object.entries(value)) {
    if (typeof tag === "string") out[key] = tag;
  }
  return out;
}

function mapItemRow(row: Record<string, unknown>): ItemBankCandidate {
  return {
    id: row.id as string,
    skill_node_id: row.skill_node_id as string,
    question_type: row.question_type as string,
    prompt: row.prompt as string,
    options: parseOptions(row.options),
    correct_answer: row.correct_answer as string,
    explanation: row.explanation as string,
    distractor_tags: parseDistractorTags(row.distractor_tags),
    difficulty_rating:
      row.difficulty_rating == null ? null : Number(row.difficulty_rating),
    status: row.status as string,
    created_at: (row.created_at as string | null) ?? null,
  };
}

function resolveCorrectAnswer(
  originalOptions: string[],
  originalCorrect: string,
  newOptions: string[]
): string | null {
  const index = originalOptions.findIndex((opt) => opt === originalCorrect);
  if (index >= 0 && index < newOptions.length) {
    return newOptions[index]!.trim();
  }
  const normalized = originalCorrect.trim();
  for (const option of newOptions) {
    if (option.trim() === normalized) return option.trim();
  }
  return null;
}

export async function getReviewQueue(): Promise<ReviewQueueData> {
  await requireRole("admin");
  const admin = createAdminClient();

  const { data: nodes, error: nodesError } = await admin
    .from("skill_nodes")
    .select("id, unit_number, unit_name, node_name, node_slug")
    .eq("subject", SUBJECT)
    .order("display_order");

  if (nodesError) throw new Error(nodesError.message);

  const nodeIds = (nodes ?? []).map((node) => node.id);
  if (nodeIds.length === 0) {
    return {
      stats: { approved: 0, pending: 0, rejected: 0 },
      nodeBreakdown: [],
      groups: [],
    };
  }

  const { data: items, error: itemsError } = await admin
    .from("item_bank")
    .select(
      "id, skill_node_id, question_type, prompt, options, correct_answer, explanation, distractor_tags, difficulty_rating, status, created_at"
    )
    .in("skill_node_id", nodeIds);

  if (itemsError) throw new Error(itemsError.message);

  const countsByNode = new Map<
    string,
    { approved: number; pending: number; rejected: number }
  >();
  for (const nodeId of nodeIds) {
    countsByNode.set(nodeId, { approved: 0, pending: 0, rejected: 0 });
  }

  const pendingByNode = new Map<string, ItemBankCandidate[]>();

  for (const row of items ?? []) {
    const nodeId = row.skill_node_id as string;
    const bucket = countsByNode.get(nodeId);
    if (!bucket) continue;

    const status = row.status as string;
    if (status === "approved") bucket.approved++;
    else if (status === "pending_review") bucket.pending++;
    else if (status === "rejected") bucket.rejected++;

    if (status === "pending_review") {
      const list = pendingByNode.get(nodeId) ?? [];
      list.push(mapItemRow(row as Record<string, unknown>));
      pendingByNode.set(nodeId, list);
    }
  }

  let approved = 0;
  let pending = 0;
  let rejected = 0;
  for (const bucket of countsByNode.values()) {
    approved += bucket.approved;
    pending += bucket.pending;
    rejected += bucket.rejected;
  }

  const nodeBreakdown: ReviewNodeSummary[] = (nodes ?? []).map((node) => {
    const bucket = countsByNode.get(node.id) ?? { approved: 0, pending: 0, rejected: 0 };
    return {
      skill_node_id: node.id,
      unit_number: node.unit_number,
      unit_name: node.unit_name,
      node_name: node.node_name,
      approved_count: bucket.approved,
      below_target: bucket.approved < 3,
    };
  });

  const groups: ReviewNodeGroup[] = (nodes ?? [])
    .map((node) => {
      const bucket = countsByNode.get(node.id) ?? { approved: 0, pending: 0, rejected: 0 };
      const nodeItems = pendingByNode.get(node.id) ?? [];
      return {
        skill_node_id: node.id,
        unit_number: node.unit_number,
        unit_name: node.unit_name,
        node_name: node.node_name,
        node_slug: node.node_slug,
        approved_count: bucket.approved,
        pending_count: bucket.pending,
        rejected_count: bucket.rejected,
        items: nodeItems,
      };
    })
    .filter((group) => group.items.length > 0);

  return {
    stats: { approved, pending, rejected },
    nodeBreakdown,
    groups,
  };
}

export async function approveItem(
  itemId: string,
  edits?: z.infer<typeof approveEditsSchema>
): Promise<{ ok: true }> {
  const adminUser = await requireRole("admin");
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) throw new Error("Invalid item id");

  const parsedEdits = approveEditsSchema.safeParse(edits);
  if (!parsedEdits.success) throw new Error("Invalid edits");

  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("item_bank")
    .select("id, options, correct_answer, status")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Item not found");
  if (existing.status !== "pending_review") throw new Error("Item is not pending review");

  const update: Record<string, unknown> = {
    status: "approved",
    reviewed_by: adminUser.email ?? adminUser.id,
    reviewed_at: new Date().toISOString(),
  };

  const editPayload = parsedEdits.data;
  if (editPayload?.prompt) update.prompt = editPayload.prompt.trim();
  if (editPayload?.explanation) update.explanation = editPayload.explanation.trim();

  if (editPayload?.options) {
    const originalOptions = parseOptions(existing.options);
    const resolvedCorrect = resolveCorrectAnswer(
      originalOptions,
      existing.correct_answer as string,
      editPayload.options
    );
    if (!resolvedCorrect) {
      throw new Error("Edited options must still include the correct answer");
    }
    update.options = editPayload.options.map((opt) => opt.trim());
    update.correct_answer = resolvedCorrect;
  }

  const { error: updateError } = await admin
    .from("item_bank")
    .update(update)
    .eq("id", parsedId.data);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/admin/item-review");
  return { ok: true };
}

export async function rejectItem(itemId: string): Promise<{ ok: true }> {
  const adminUser = await requireRole("admin");
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) throw new Error("Invalid item id");

  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("item_bank")
    .select("id, status")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Item not found");
  if (existing.status !== "pending_review") throw new Error("Item is not pending review");

  const { error: updateError } = await admin
    .from("item_bank")
    .update({
      status: "rejected",
      reviewed_by: adminUser.email ?? adminUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsedId.data);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/admin/item-review");
  return { ok: true };
}

export async function approveAllPending(): Promise<{ approved: number }> {
  const adminUser = await requireRole("admin");
  const admin = createAdminClient();

  const { data: nodes, error: nodesError } = await admin
    .from("skill_nodes")
    .select("id")
    .eq("subject", SUBJECT);

  if (nodesError) throw new Error(nodesError.message);

  const nodeIds = (nodes ?? []).map((node) => node.id);
  if (nodeIds.length === 0) return { approved: 0 };

  const { data: approvedRows, error: updateError } = await admin
    .from("item_bank")
    .update({
      status: "approved",
      reviewed_by: adminUser.email ?? adminUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .in("skill_node_id", nodeIds)
    .eq("status", "pending_review")
    .select("id");

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/admin/item-review");
  return { approved: approvedRows?.length ?? 0 };
}

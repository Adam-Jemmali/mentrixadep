"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  parsePartialCreditRules,
  parseSolutionSteps,
} from "@/features/quest/components/step-feedback-pure";
import { expressionParses } from "@/features/free-response/symbolic-grade-pure";
import {
  validateFreeResponseForApprove,
  type ItemReviewQueueFilter,
} from "@/features/admin/item-review-pure";
import { validateStemQualityForApprove } from "@/features/quest/quest-authoring-doctrine-pure";
import { parseQuestStimulus, type QuestStimulus } from "@/features/quest/quest-stimulus-pure";
import {
  isConstructionItemFormat,
  parseClozeBlanks,
  parseDragOrderedItems,
  parseGraphFeatureTargets,
} from "@/features/quest/quest-interaction-formats-pure";
import { validateConstructionGroundTruth } from "@/features/quest/construction-auto-approve-pure";

const uuidSchema = z.string().uuid();
const filterSchema = z.enum(["pending_review", "approved", "rejected", "all"]);

export type ItemReviewListItem = {
  id: string;
  prompt: string;
  status: string;
  itemFormat: string;
  difficultyRating: number | null;
  createdAt: string | null;
  skillNodeId: string;
  nodeName: string;
  unitName: string;
  unitNumber: number;
};

export type ItemReviewDetail = ItemReviewListItem & {
  options: string[];
  correctAnswer: string;
  explanation: string;
  answerExpression: string | null;
  answerAlternatives: string[];
  solutionSteps: ReturnType<typeof parseSolutionSteps>;
  partialCreditRules: ReturnType<typeof parsePartialCreditRules>;
  stimulus: QuestStimulus[];
  secondarySkillTags: string[];
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type ItemReviewQueuePayload = {
  items: ItemReviewListItem[];
  pendingCount: number;
  approvedCount: number;
};

function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

export async function getItemReviewQueue(
  filter: ItemReviewQueueFilter = "pending_review",
): Promise<ItemReviewQueuePayload> {
  await requireRole("admin");
  const parsedFilter = filterSchema.safeParse(filter);
  const statusFilter = parsedFilter.success ? parsedFilter.data : "pending_review";
  const admin = createAdminClient();

  let query = admin
    .from("item_bank")
    .select(
      "id, prompt, status, item_format, difficulty_rating, created_at, skill_node_id, skill_nodes(node_name, unit_name, unit_number)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const [{ data, error }, pendingRes, approvedRes] = await Promise.all([
    query,
    admin
      .from("item_bank")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    admin
      .from("item_bank")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
  ]);

  if (error) {
    console.error("[getItemReviewQueue]", error.message);
    return {
      items: [],
      pendingCount: pendingRes.count ?? 0,
      approvedCount: approvedRes.count ?? 0,
    };
  }

  const items: ItemReviewListItem[] = (data ?? []).map((row) => {
    const nodeRaw = row.skill_nodes as
      | { node_name: string; unit_name: string; unit_number: number }
      | { node_name: string; unit_name: string; unit_number: number }[]
      | null;
    const node = Array.isArray(nodeRaw) ? nodeRaw[0] : nodeRaw;
    return {
      id: row.id,
      prompt: row.prompt,
      status: row.status,
      itemFormat: row.item_format ?? "mcq",
      difficultyRating: row.difficulty_rating == null ? null : Number(row.difficulty_rating),
      createdAt: row.created_at,
      skillNodeId: row.skill_node_id,
      nodeName: node?.node_name ?? "Unknown node",
      unitName: node?.unit_name ?? "Unknown unit",
      unitNumber: node?.unit_number ?? 0,
    };
  });

  return {
    items,
    pendingCount: pendingRes.count ?? 0,
    approvedCount: approvedRes.count ?? 0,
  };
}

export async function getItemReviewDetail(
  itemId: string,
): Promise<ItemReviewDetail | null> {
  await requireRole("admin");
  const parsed = uuidSchema.safeParse(itemId);
  if (!parsed.success) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("item_bank")
    .select(
      "id, prompt, status, item_format, difficulty_rating, created_at, skill_node_id, options, correct_answer, explanation, answer_expression, answer_alternatives, solution_steps, partial_credit_rules, stimulus, secondary_skill_tags, reviewed_by, reviewed_at, skill_nodes(node_name, unit_name, unit_number)",
    )
    .eq("id", parsed.data)
    .maybeSingle();

  if (error || !data) return null;

  const nodeRaw = data.skill_nodes as
    | { node_name: string; unit_name: string; unit_number: number }
    | { node_name: string; unit_name: string; unit_number: number }[]
    | null;
  const node = Array.isArray(nodeRaw) ? nodeRaw[0] : nodeRaw;

  return {
    id: data.id,
    prompt: data.prompt,
    status: data.status,
    itemFormat: data.item_format ?? "mcq",
    difficultyRating: data.difficulty_rating == null ? null : Number(data.difficulty_rating),
    createdAt: data.created_at,
    skillNodeId: data.skill_node_id,
    nodeName: node?.node_name ?? "Unknown node",
    unitName: node?.unit_name ?? "Unknown unit",
    unitNumber: node?.unit_number ?? 0,
    options: parseOptions(data.options),
    correctAnswer: data.correct_answer,
    explanation: data.explanation,
    answerExpression: data.answer_expression,
    answerAlternatives: Array.isArray(data.answer_alternatives)
      ? data.answer_alternatives.filter((entry): entry is string => typeof entry === "string")
      : [],
    solutionSteps: parseSolutionSteps(data.solution_steps),
    partialCreditRules: parsePartialCreditRules(data.partial_credit_rules),
    stimulus: parseQuestStimulus(data.stimulus),
    secondarySkillTags: Array.isArray(data.secondary_skill_tags)
      ? data.secondary_skill_tags.filter((entry): entry is string => typeof entry === "string")
      : [],
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
  };
}

export async function approveItemBankItem(
  itemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminUser = await requireRole("admin");
  const parsed = uuidSchema.safeParse(itemId);
  if (!parsed.success) return { ok: false, error: "Invalid item." };

  const detail = await getItemReviewDetail(parsed.data);
  if (!detail) return { ok: false, error: "Item not found." };
  if (detail.status !== "pending_review") {
    return { ok: false, error: "Only pending items can be approved." };
  }

  const admin = createAdminClient();
  const { data: rawRow } = await admin
    .from("item_bank")
    .select("solution_steps, options, stimulus, authoring_meta, distractor_tags")
    .eq("id", parsed.data)
    .maybeSingle();

  const blocked = [
    ...validateFreeResponseForApprove({
      itemFormat: detail.itemFormat,
      answerExpression: detail.answerExpression,
      solutionSteps: detail.solutionSteps,
      difficultyRating: detail.difficultyRating,
      expressionParses,
    }),
    ...validateStemQualityForApprove({
      prompt: detail.prompt,
      itemFormat: detail.itemFormat,
      distractorTags:
        rawRow?.distractor_tags && typeof rawRow.distractor_tags === "object"
          ? (rawRow.distractor_tags as Record<string, string>)
          : null,
      stimulus: rawRow?.stimulus ?? detail.stimulus,
      authoringMeta: rawRow?.authoring_meta,
      doctrineRequired: false,
    }),
  ];

  if (detail.itemFormat === "complete_expression") {
    const blanks = parseClozeBlanks(rawRow?.solution_steps);
    if (blanks.length < 1) {
      blocked.push("complete_expression needs blank expressions in solution_steps.");
    }
  }
  if (detail.itemFormat === "drag_order") {
    if (parseDragOrderedItems(rawRow?.options ?? detail.options).length < 2) {
      blocked.push("drag_order needs ≥2 ordered options.");
    }
  }
  if (detail.itemFormat === "graph_feature") {
    const targets = parseGraphFeatureTargets(rawRow?.solution_steps);
    const sketchExpr = (detail.answerExpression ?? "").trim();
    if (targets.length < 1 && !sketchExpr) {
      blocked.push(
        "graph_feature needs authored targets and/or a parseable answer_expression for sketch grading.",
      );
    }
    const stimulus = parseQuestStimulus(rawRow?.stimulus ?? detail.stimulus);
    if (!stimulus.some((s) => s.kind === "function_graph")) {
      blocked.push("graph_feature needs a function_graph stimulus.");
    }
  }

  if (isConstructionItemFormat(detail.itemFormat) || detail.itemFormat === "multi_part") {
    const gate = validateConstructionGroundTruth({
      itemFormat: detail.itemFormat,
      prompt: detail.prompt,
      options: rawRow?.options ?? detail.options,
      correctAnswer: detail.correctAnswer,
      answerExpression: detail.answerExpression,
      solutionSteps: rawRow?.solution_steps ?? detail.solutionSteps,
      stimulus: rawRow?.stimulus ?? detail.stimulus,
      authoringMeta: rawRow?.authoring_meta,
      explanation: detail.explanation,
    });
    if (!gate.ok) blocked.push(...gate.reasons);
  }

  if (blocked.length > 0) {
    return { ok: false, error: blocked[0]! };
  }

  const { error } = await admin
    .from("item_bank")
    .update({
      status: "approved",
      reviewed_by: adminUser.email ?? adminUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data)
    .eq("status", "pending_review");

  if (error) {
    console.error("[approveItemBankItem]", error.message);
    return { ok: false, error: "Could not approve item." };
  }

  revalidatePath("/admin/item-review");
  return { ok: true };
}

export async function rejectItemBankItem(
  itemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminUser = await requireRole("admin");
  const parsed = uuidSchema.safeParse(itemId);
  if (!parsed.success) return { ok: false, error: "Invalid item." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("item_bank")
    .select("status")
    .eq("id", parsed.data)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Item not found." };
  if (existing.status !== "pending_review") {
    return { ok: false, error: "Only pending items can be rejected." };
  }

  const { error } = await admin
    .from("item_bank")
    .update({
      status: "rejected",
      reviewed_by: adminUser.email ?? adminUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data)
    .eq("status", "pending_review");

  if (error) {
    console.error("[rejectItemBankItem]", error.message);
    return { ok: false, error: "Could not reject item." };
  }

  revalidatePath("/admin/item-review");
  return { ok: true };
}

const secondaryTagsSchema = z
  .array(z.string().trim().min(1).max(120))
  .max(24);

/** Reviewed secondary skill slugs only. No live AI tagging. */
export async function updateItemSecondarySkillTags(
  itemId: string,
  tags: string[],
): Promise<{ ok: true; tags: string[] } | { ok: false; error: string }> {
  await requireRole("admin");
  const idParsed = uuidSchema.safeParse(itemId);
  if (!idParsed.success) return { ok: false, error: "Invalid item." };

  const tagsParsed = secondaryTagsSchema.safeParse(tags);
  if (!tagsParsed.success) return { ok: false, error: "Invalid tags." };

  const normalized = [
    ...new Set(
      tagsParsed.data.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    ),
  ];

  const admin = createAdminClient();
  const { error } = await admin
    .from("item_bank")
    .update({ secondary_skill_tags: normalized })
    .eq("id", idParsed.data);

  if (error) {
    console.error("[updateItemSecondarySkillTags]", error.message);
    return { ok: false, error: "Could not save tags." };
  }

  revalidatePath("/admin/item-review");
  return { ok: true, tags: normalized };
}

/** Coverage snapshot for the admin queue header. */
export async function getItemBankCoverageBrief(): Promise<{
  subject: string;
  pendingCount: number;
  approvedCount: number;
}> {
  await requireRole("admin");
  const admin = createAdminClient();
  const [pendingRes, approvedRes] = await Promise.all([
    admin
      .from("item_bank")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    admin
      .from("item_bank")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
  ]);

  return {
    subject: AP_CALC_AB_SUBJECT,
    pendingCount: pendingRes.count ?? 0,
    approvedCount: approvedRes.count ?? 0,
  };
}

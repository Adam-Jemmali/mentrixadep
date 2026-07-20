import { z } from "zod";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { failureTagFromDistractor } from "@/features/skill-tree/skill-error-aggregate-pure";

const recordSchema = z.object({
  userId: z.string().uuid(),
  skillNodeId: z.string().uuid(),
  itemId: z.string().uuid().nullable().optional(),
  failureTag: z.string().max(500).nullable().optional(),
  secondaryTags: z.array(z.string().min(1).max(120)).max(24).default([]),
});

export type RecordSkillErrorInput = z.infer<typeof recordSchema>;

/** Persist one wrong-answer event. Server/admin client only. */
export async function recordSkillErrorEvent(
  input: RecordSkillErrorInput,
): Promise<void> {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return;

  const admin = createAdminClient();
  const secondaryTags = parsed.data.secondaryTags
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  const { error } = await admin.from("skill_error_events").insert({
    user_id: parsed.data.userId,
    skill_node_id: parsed.data.skillNodeId,
    item_id: parsed.data.itemId ?? null,
    failure_tag: parsed.data.failureTag?.trim() || null,
    secondary_tags: secondaryTags,
  });

  if (error) {
    console.error("[skill-error-events]", error.message);
  }
}

export async function loadRecentSkillErrorEvents(
  userId: string,
  limit = 40,
): Promise<
  Array<{
    skillNodeId: string;
    failureTag: string | null;
    secondaryTags: string[];
  }>
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("skill_error_events")
    .select("skill_node_id, failure_tag, secondary_tags")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error("[skill-error-events] load", error.message);
    return [];
  }

  return data.map((row) => ({
    skillNodeId: String(row.skill_node_id),
    failureTag: row.failure_tag ? String(row.failure_tag) : null,
    secondaryTags: Array.isArray(row.secondary_tags)
      ? row.secondary_tags.map(String)
      : [],
  }));
}

export async function loadItemErrorTagging(itemId: string): Promise<{
  distractorTags: Record<string, string>;
  secondaryTags: string[];
}> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("item_bank")
    .select("distractor_tags, secondary_skill_tags")
    .eq("id", itemId)
    .maybeSingle();

  const distractorTags =
    data?.distractor_tags &&
    typeof data.distractor_tags === "object" &&
    !Array.isArray(data.distractor_tags)
      ? (data.distractor_tags as Record<string, string>)
      : {};

  const secondaryTags = Array.isArray(data?.secondary_skill_tags)
    ? data.secondary_skill_tags.map(String)
    : [];

  return { distractorTags, secondaryTags };
}

/** Wrong answer with item secondary tags only (FR / non-MCQ). */
export async function recordPracticeSecondaryMiss(input: {
  userId: string;
  skillNodeId: string;
  itemId: string;
  failureTag?: string | null;
}): Promise<void> {
  const tagging = await loadItemErrorTagging(input.itemId);
  await recordSkillErrorEvent({
    userId: input.userId,
    skillNodeId: input.skillNodeId,
    itemId: input.itemId,
    failureTag: input.failureTag ?? null,
    secondaryTags: tagging.secondaryTags,
  });
}

export async function recordPracticeMcqMiss(input: {
  userId: string;
  skillNodeId: string;
  itemId: string;
  selectedOptionText: string;
  selectedIndex: number;
}): Promise<void> {
  const tagging = await loadItemErrorTagging(input.itemId);
  const failureTag = failureTagFromDistractor(
    tagging.distractorTags,
    input.selectedOptionText,
    input.selectedIndex,
  );

  await recordSkillErrorEvent({
    userId: input.userId,
    skillNodeId: input.skillNodeId,
    itemId: input.itemId,
    failureTag,
    secondaryTags: tagging.secondaryTags,
  });
}

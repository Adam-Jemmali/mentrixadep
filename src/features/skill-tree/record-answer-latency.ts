import { z } from "zod";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  clampAnsweredMs,
  detectFasterVelocity,
} from "@/features/skill-tree/skill-velocity-pure";

const recordSchema = z.object({
  userId: z.string().uuid(),
  skillNodeId: z.string().uuid(),
  itemId: z.string().uuid().nullable().optional(),
  answeredMs: z.number().finite().nullable().optional(),
});

export async function recordSkillAnswerLatency(
  input: z.infer<typeof recordSchema>,
): Promise<number | null> {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return null;
  const ms = clampAnsweredMs(parsed.data.answeredMs);
  if (ms == null) return null;

  const admin = createAdminClient();
  const { error } = await admin.from("skill_answer_latencies").insert({
    user_id: parsed.data.userId,
    skill_node_id: parsed.data.skillNodeId,
    item_id: parsed.data.itemId ?? null,
    answered_ms: ms,
  });

  if (error) {
    console.error("[skill-answer-latencies]", error.message);
    return null;
  }
  return ms;
}

export async function loadPriorAnswerLatencies(
  userId: string,
  skillNodeId: string,
  limit = 40,
): Promise<number[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("skill_answer_latencies")
    .select("answered_ms")
    .eq("user_id", userId)
    .eq("skill_node_id", skillNodeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error("[skill-answer-latencies] load", error.message);
    return [];
  }

  return data
    .map((row) => clampAnsweredMs(row.answered_ms))
    .filter((n): n is number => n != null);
}

export async function detectFasterForPackNodes(input: {
  userId: string;
  /** nodeId → latencies recorded in this pack (already clamped). */
  recentByNode: Map<string, number[]>;
}): Promise<{ nodeId: string } | null> {
  for (const [nodeId, recentMs] of input.recentByNode) {
    if (recentMs.length === 0) continue;
    const priorAll = await loadPriorAnswerLatencies(input.userId, nodeId);
    // Prior = samples before this pack's inserts (exclude trailing recent count).
    const priorMs = priorAll.slice(recentMs.length);
    if (
      detectFasterVelocity({
        priorMs,
        recentMs,
      })
    ) {
      return { nodeId };
    }
  }
  return null;
}

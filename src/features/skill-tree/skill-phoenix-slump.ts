import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  applyPhoenixSlumpOutcome,
  defaultPhoenixSlumpState,
  type PhoenixSlumpState,
} from "@/features/skill-tree/skill-phoenix-pure";

async function readPhoenixSlumpState(
  userId: string,
  skillNodeId: string,
): Promise<PhoenixSlumpState> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("skill_phoenix_slumps")
    .select("consecutive_incorrect, slump_pending")
    .eq("user_id", userId)
    .eq("skill_node_id", skillNodeId)
    .maybeSingle();

  if (error || !data) return defaultPhoenixSlumpState();

  return {
    consecutiveIncorrect: Number(data.consecutive_incorrect ?? 0),
    slumpPending: Boolean(data.slump_pending),
  };
}

export async function recordPhoenixPracticeOutcome(input: {
  userId: string;
  skillNodeId: string;
  correct: boolean;
}): Promise<PhoenixSlumpState> {
  const prior = await readPhoenixSlumpState(input.userId, input.skillNodeId);
  const next = applyPhoenixSlumpOutcome(prior, input.correct);

  const admin = createAdminClient();
  const { error } = await admin.from("skill_phoenix_slumps").upsert(
    {
      user_id: input.userId,
      skill_node_id: input.skillNodeId,
      consecutive_incorrect: next.consecutiveIncorrect,
      slump_pending: next.slumpPending,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,skill_node_id" },
  );

  if (error) {
    console.error("[phoenix-slump]", error.message);
  }

  return next;
}

export async function loadPendingPhoenixSlumpNodeIds(
  userId: string,
): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("skill_phoenix_slumps")
    .select("skill_node_id")
    .eq("user_id", userId)
    .eq("slump_pending", true);

  if (error || !data) {
    if (error) console.error("[phoenix-slump] load", error.message);
    return new Set();
  }

  return new Set(data.map((row) => String(row.skill_node_id)));
}

export async function clearPhoenixSlump(
  userId: string,
  skillNodeId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("skill_phoenix_slumps")
    .update({
      consecutive_incorrect: 0,
      slump_pending: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("skill_node_id", skillNodeId);

  if (error) {
    console.error("[phoenix-slump] clear", error.message);
  }
}

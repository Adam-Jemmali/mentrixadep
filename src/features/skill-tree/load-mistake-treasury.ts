import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  distinctMissItemIds,
  type MissEventRow,
} from "@/features/skill-tree/mistake-treasury-pure";

export async function loadMistakeTreasuryItemIds(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: events, error } = await admin
    .from("skill_error_events")
    .select("item_id")
    .eq("user_id", userId)
    .not("item_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    console.error("[mistake-treasury] events", error.message);
    return [];
  }

  const candidateIds = [
    ...new Set(
      (events ?? [])
        .map((row) => (row.item_id ? String(row.item_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (candidateIds.length === 0) return [];

  const { data: approved, error: approvedError } = await admin
    .from("item_bank")
    .select("id")
    .eq("status", "approved")
    .in("id", candidateIds);

  if (approvedError) {
    console.error("[mistake-treasury] approved", approvedError.message);
    return [];
  }

  const approvedIds = new Set((approved ?? []).map((row) => String(row.id)));
  return distinctMissItemIds(
    (events ?? []).map(
      (row): MissEventRow => ({ itemId: row.item_id ? String(row.item_id) : null }),
    ),
    approvedIds,
  );
}

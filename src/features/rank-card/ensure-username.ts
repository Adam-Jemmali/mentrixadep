"use server";

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { isValidRankCardUsername, suggestRankCardUsername } from "@/features/rank-card/username";

async function isUsernameTaken(admin: ReturnType<typeof createAdminClient>, username: string): Promise<boolean> {
  const { data } = await admin
    .from("user_settings")
    .select("user_id")
    .ilike("rank_card_username", username)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Ensures the student has a unique public rank card slug. Idempotent when already set.
 */
export async function ensureRankCardUsername(
  userId: string,
  displayName: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("user_settings")
    .select("rank_card_username")
    .eq("user_id", userId)
    .maybeSingle();

  const existing = row?.rank_card_username;
  if (typeof existing === "string" && existing.trim()) {
    return existing.trim().toLowerCase();
  }

  const base = suggestRankCardUsername(displayName);
  const candidates = [base, ...Array.from({ length: 24 }, (_, i) => suggestRankCardUsername(displayName, String(i + 2)))];

  for (const candidate of candidates) {
    if (!isValidRankCardUsername(candidate)) continue;
    if (await isUsernameTaken(admin, candidate)) continue;

    const { error } = await admin.from("user_settings").upsert(
      {
        user_id: userId,
        rank_card_username: candidate,
        rank_card_public: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (!error) return candidate;
  }

  return null;
}

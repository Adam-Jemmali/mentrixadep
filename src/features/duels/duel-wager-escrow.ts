/**
 * Escrow debit for duel XP wagers only. Not a general XP decrease API.
 */

import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { recordSecurityEvent } from "@/shared/core/security/security-events";

export async function applyXpEscrowDebit(params: {
  userId: string;
  amount: number;
  awardKey: string;
  divisionKey?: string | null;
}): Promise<{ ok: true; totalXp: number } | { ok: false; error: string }> {
  const amount = params.amount;
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "Escrow amount must be a positive integer." };
  }

  const admin = createAdminClient();
  const { error: ledgerErr } = await admin.from("xp_award_ledger").insert({
    user_id: params.userId,
    award_key: params.awardKey,
    xp_amount: -amount,
  });

  if (ledgerErr) {
    if (ledgerErr.code === "23505") {
      const { data: row } = await admin
        .from("user_xp")
        .select("total_xp")
        .eq("user_id", params.userId)
        .maybeSingle();
      return { ok: true, totalXp: row?.total_xp ?? 0 };
    }
    return { ok: false, error: ledgerErr.message };
  }

  const { data: existing } = await admin
    .from("user_xp")
    .select("total_xp, division_xp")
    .eq("user_id", params.userId)
    .maybeSingle();

  const oldTotal = existing?.total_xp ?? 0;
  const newTotal = oldTotal - amount;
  if (newTotal < 0) {
    await recordSecurityEvent({
      event_type: "xp_decrease_blocked",
      user_id: params.userId,
      metadata: {
        amount: -amount,
        award_key: params.awardKey,
        reason: "escrow_would_go_negative",
      },
    });
    return { ok: false, error: "Not enough XP for this stake." };
  }

  const currentDivXp = (existing?.division_xp as Record<string, number>) ?? {};
  const newDivXp: Record<string, number> = { ...currentDivXp };
  if (params.divisionKey) {
    newDivXp[params.divisionKey] = Math.max(
      0,
      (newDivXp[params.divisionKey] ?? 0) - amount,
    );
  }

  if (existing) {
    const { error } = await admin
      .from("user_xp")
      .update({ total_xp: newTotal, division_xp: newDivXp })
      .eq("user_id", params.userId);
    if (error) return { ok: false, error: error.message };
  } else {
    return { ok: false, error: "No XP balance." };
  }

  return { ok: true, totalXp: newTotal };
}

"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { parseUUID, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/shared/core/security";
import { applyXpAward } from "@/features/xp/xp-awards";
import { applyXpEscrowDebit } from "@/features/duels/duel-wager-escrow";
import {
  duelWagerPot,
  isValidDuelWagerAmount,
  maxAffordableDuelWagerXp,
  maxDuelWagerXp,
  DUEL_WAGER_CAP_FRACTION,
} from "@/features/duels/duel-wager-pure";
import { z } from "zod";

export type DuelXpWagerRow = {
  id: string;
  duelId: string;
  challengerId: string;
  opponentId: string;
  challengerWager: number;
  opponentWager: number;
  status: "pending" | "accepted" | "rejected" | "settled";
  winnerId: string | null;
  settledAt: string | null;
};

function mapWager(row: Record<string, unknown>): DuelXpWagerRow {
  return {
    id: String(row.id),
    duelId: String(row.duel_id),
    challengerId: String(row.challenger_id),
    opponentId: String(row.opponent_id),
    challengerWager: Number(row.challenger_wager),
    opponentWager: Number(row.opponent_wager),
    status: row.status as DuelXpWagerRow["status"],
    winnerId: row.winner_id == null ? null : String(row.winner_id),
    settledAt: row.settled_at == null ? null : String(row.settled_at),
  };
}

async function loadTotalXp(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<number> {
  const { data } = await admin
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", userId)
    .maybeSingle();
  return Number(data?.total_xp ?? 0);
}

export async function getDuelWagerMaxForViewer(): Promise<{
  totalXp: number;
  maxWager: number;
  affordableMax: number;
}> {
  const user = await requireRole(["student", "admin"]);
  const admin = createAdminClient();
  const totalXp = await loadTotalXp(admin, user.id);
  return {
    totalXp,
    maxWager: maxDuelWagerXp(totalXp),
    affordableMax: maxAffordableDuelWagerXp(totalXp),
  };
}

export async function loadDuelXpWager(duelId: string): Promise<DuelXpWagerRow | null> {
  const user = await requireRole(["student", "admin"]);
  const parsed = parseUUID(duelId);
  if (!parsed.ok) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("duel_xp_wagers")
    .select("*")
    .eq("duel_id", parsed.id)
    .maybeSingle();

  if (!data) return null;
  const row = mapWager(data as Record<string, unknown>);
  if (row.challengerId !== user.id && row.opponentId !== user.id && user.role !== "admin") {
    return null;
  }
  return row;
}

const proposeSchema = z.object({
  duelId: z.string().uuid(),
  amount: z.number().int().positive(),
  totalXp: z.number().int().nonnegative(),
}).superRefine((val, ctx) => {
  if (!isValidDuelWagerAmount(val.amount, val.totalXp)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["amount"],
      message: `Stake exceeds the ${Math.round(DUEL_WAGER_CAP_FRACTION * 100)}% XP cap.`,
    });
  }
});

/** Challenger optional stake. Amount must pass server cap + floor. */
export async function proposeDuelXpWager(
  duelId: string,
  amount: number,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole(["student", "admin"]);
  enforceRateLimit(getRateLimitId(user.id), RATE_LIMITS.duelCreate, "propose wager");

  const admin = createAdminClient();
  const totalXp = await loadTotalXp(admin, user.id);
  const parsed = proposeSchema.safeParse({ duelId, amount, totalXp });
  if (!parsed.success) {
    const zodCap = parsed.error.issues.some((i) =>
      String(i.message).toLowerCase().includes("cap"),
    );
    return {
      success: false,
      error: zodCap
        ? `Stake exceeds the ${Math.round(DUEL_WAGER_CAP_FRACTION * 100)}% XP cap.`
        : "Invalid stake.",
    };
  }

  const { data: duel } = await admin
    .from("skill_duels")
    .select("id, student_id, opponent_student_id, status, is_ai_opponent")
    .eq("id", parsed.data.duelId)
    .maybeSingle();

  if (!duel || duel.status !== "pending") {
    return { success: false, error: "Duel is not open for a stake." };
  }
  if (duel.is_ai_opponent) {
    return { success: false, error: "Stakes are not available vs Sparring Quest." };
  }
  if (duel.student_id !== user.id) {
    return { success: false, error: "Only the challenger can add a stake." };
  }
  if (!duel.opponent_student_id) {
    return { success: false, error: "Opponent required." };
  }

  const { error } = await admin.from("duel_xp_wagers").insert({
    duel_id: duel.id,
    challenger_id: duel.student_id,
    opponent_id: duel.opponent_student_id,
    challenger_wager: parsed.data.amount,
    opponent_wager: parsed.data.amount,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A stake is already set for this duel." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(`/student/duel/${duel.id}`);
  return { success: true };
}

/** Opponent accepts matching stake — escrow both sides. */
export async function acceptDuelXpWagerStake(
  duelId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole(["student", "admin"]);
  const id = parseUUID(duelId);
  if (!id.ok) return { success: false, error: "Invalid duel." };

  const admin = createAdminClient();
  const { data: wager } = await admin
    .from("duel_xp_wagers")
    .select("*")
    .eq("duel_id", id.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!wager) return { success: false, error: "No pending stake." };
  if (wager.opponent_id !== user.id) {
    return { success: false, error: "Only the opponent can accept this stake." };
  }

  const { data: duel } = await admin
    .from("skill_duels")
    .select("division_key, status")
    .eq("id", id.id)
    .maybeSingle();

  if (!duel || duel.status !== "pending") {
    return { success: false, error: "Duel is not pending." };
  }

  const amount = Number(wager.challenger_wager);
  const challengerXp = await loadTotalXp(admin, String(wager.challenger_id));
  const opponentXp = await loadTotalXp(admin, user.id);

  if (!isValidDuelWagerAmount(amount, challengerXp) || !isValidDuelWagerAmount(amount, opponentXp)) {
    return { success: false, error: "Stake no longer fits both XP balances." };
  }

  const cDebit = await applyXpEscrowDebit({
    userId: String(wager.challenger_id),
    amount,
    awardKey: `duel_wager_escrow:${id.id}:challenger`,
    divisionKey: duel.division_key,
  });
  if (!cDebit.ok) return { success: false, error: cDebit.error };

  const oDebit = await applyXpEscrowDebit({
    userId: user.id,
    amount,
    awardKey: `duel_wager_escrow:${id.id}:opponent`,
    divisionKey: duel.division_key,
  });
  if (!oDebit.ok) {
    await applyXpAward(
      String(wager.challenger_id),
      amount,
      `duel_wager_refund_failed_accept:${id.id}:challenger`,
      duel.division_key,
    );
    return { success: false, error: oDebit.error };
  }

  const { error } = await admin
    .from("duel_xp_wagers")
    .update({ status: "accepted", opponent_wager: amount })
    .eq("id", wager.id)
    .eq("status", "pending");

  if (error) return { success: false, error: error.message };

  revalidatePath(`/student/duel/${id.id}`);
  return { success: true };
}

/** Opponent plays without a stake. */
export async function rejectDuelXpWager(
  duelId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole(["student", "admin"]);
  const id = parseUUID(duelId);
  if (!id.ok) return { success: false, error: "Invalid duel." };

  const admin = createAdminClient();
  const { data: wager } = await admin
    .from("duel_xp_wagers")
    .select("id, opponent_id, status")
    .eq("duel_id", id.id)
    .maybeSingle();

  if (!wager || wager.status !== "pending") {
    return { success: true };
  }
  if (wager.opponent_id !== user.id) {
    return { success: false, error: "Only the opponent can skip this stake." };
  }

  await admin
    .from("duel_xp_wagers")
    .update({ status: "rejected" })
    .eq("id", wager.id)
    .eq("status", "pending");

  revalidatePath(`/student/duel/${id.id}`);
  return { success: true };
}

/** Internal: settle accepted wager once. */
export async function settleDuelXpWager(params: {
  duelId: string;
  winnerUserId: string | null;
  isTie: boolean;
  divisionKey: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: wager } = await admin
    .from("duel_xp_wagers")
    .select("*")
    .eq("duel_id", params.duelId)
    .eq("status", "accepted")
    .maybeSingle();

  if (!wager) return;

  const cW = Number(wager.challenger_wager);
  const oW = Number(wager.opponent_wager);
  const pot = duelWagerPot(cW, oW);

  if (params.isTie) {
    await applyXpAward(
      String(wager.challenger_id),
      cW,
      `duel_wager_refund:${params.duelId}:challenger`,
      params.divisionKey,
    );
    await applyXpAward(
      String(wager.opponent_id),
      oW,
      `duel_wager_refund:${params.duelId}:opponent`,
      params.divisionKey,
    );
  } else if (params.winnerUserId) {
    await applyXpAward(
      params.winnerUserId,
      pot,
      `duel_wager_win:${params.duelId}`,
      params.divisionKey,
    );
  }

  await admin
    .from("duel_xp_wagers")
    .update({
      status: "settled",
      winner_id: params.isTie ? null : params.winnerUserId,
      settled_at: new Date().toISOString(),
    })
    .eq("id", wager.id)
    .eq("status", "accepted");
}

/** Refund escrow if duel ends before play with an accepted stake. */
export async function refundAcceptedDuelXpWager(
  duelId: string,
  divisionKey: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: wager } = await admin
    .from("duel_xp_wagers")
    .select("*")
    .eq("duel_id", duelId)
    .eq("status", "accepted")
    .maybeSingle();

  if (!wager) return;

  const cW = Number(wager.challenger_wager);
  const oW = Number(wager.opponent_wager);

  await applyXpAward(
    String(wager.challenger_id),
    cW,
    `duel_wager_cancel_refund:${duelId}:challenger`,
    divisionKey,
  );
  await applyXpAward(
    String(wager.opponent_id),
    oW,
    `duel_wager_cancel_refund:${duelId}:opponent`,
    divisionKey,
  );

  await admin
    .from("duel_xp_wagers")
    .update({ status: "rejected", settled_at: new Date().toISOString() })
    .eq("id", wager.id)
    .eq("status", "accepted");
}

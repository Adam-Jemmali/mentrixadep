"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { parseUUID, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/shared/core/security";
import {
  bothSidesReady,
  isQueueStyleMatchSource,
  type DuelReadyRow,
} from "@/features/duels/duel-internal";
import { activateSkillDuelSession } from "@/features/duels/duel-gameplay";
import { assertAllowedArenaDivisionKey } from "@/features/divisions/ap-calc-ab-division";

async function tryActivateQueueMatchWhenReady(
  admin: ReturnType<typeof createAdminClient>,
  duelId: string
): Promise<boolean> {
  const { data: duel } = await admin
    .from("skill_duels")
    .select(
      "id, student_id, opponent_student_id, status, division_key, match_source, is_ai_opponent, student_ready_at, opponent_ready_at"
    )
    .eq("id", duelId)
    .maybeSingle();

  if (!duel || duel.status !== "pending") return false;
  if (!isQueueStyleMatchSource(duel.match_source as string | null)) return false;
  if (!bothSidesReady(duel as DuelReadyRow)) return false;

  const activate = await activateSkillDuelSession(duelId);
  return activate.success;
}

/**
 * Instant start: mark both sides ready and activate in one shot.
 * Used for human queue matches and Sparring Quest — no mutual-accept wait.
 */
export async function instantStartQueueMatch(
  duelId: string
): Promise<
  | { success: true; duelId: string; activated: boolean; status: string }
  | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can start a duel." };
    }

    const id = parseUUID(duelId);
    if (!id.ok) return { success: false, error: "Invalid duel." };

    const admin = createAdminClient();
    const { data: duel, error: fetchErr } = await admin
      .from("skill_duels")
      .select(
        "id, student_id, opponent_student_id, status, match_source, is_ai_opponent, student_ready_at, opponent_ready_at"
      )
      .eq("id", id.id)
      .maybeSingle();

    if (fetchErr || !duel) {
      return { success: false, error: "Duel not found." };
    }

    const ms = duel.match_source as string | null;
    if (!isQueueStyleMatchSource(ms)) {
      return { success: false, error: "Not a queue match." };
    }

    const isAi = duel.is_ai_opponent === true;
    const isParticipant =
      user.id === duel.student_id ||
      (!isAi && user.id === duel.opponent_student_id);
    if (!isParticipant) {
      return { success: false, error: "Not a participant." };
    }

    if (duel.status === "active" || duel.status === "completed") {
      return { success: true, duelId: id.id, activated: true, status: duel.status };
    }

    if (duel.status !== "pending") {
      return { success: false, error: "This match is no longer available." };
    }

    const now = new Date().toISOString();
    await admin
      .from("skill_duels")
      .update({
        student_ready_at: duel.student_ready_at ?? now,
        opponent_ready_at: duel.opponent_ready_at ?? now,
        updated_at: now,
      })
      .eq("id", id.id)
      .eq("status", "pending");

    const activated = await tryActivateQueueMatchWhenReady(admin, id.id);

    const { data: after } = await admin
      .from("skill_duels")
      .select("status")
      .eq("id", id.id)
      .maybeSingle();

    revalidatePath("/student/duel");
    revalidatePath(`/student/duel/${id.id}`);

    return {
      success: true,
      duelId: id.id,
      activated: activated || after?.status === "active",
      status: after?.status ?? (activated ? "active" : "pending"),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to start duel.",
    };
  }
}

/** Normalize RPC row (array vs object; snake_case vs camelCase from PostgREST / clients). */
function parseDuelQueueJoinRpc(rpcData: unknown): {
  matched: boolean;
  duelId: string | null;
  opponentId: string | null;
} {
  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  if (!row || typeof row !== "object") {
    return { matched: false, duelId: null, opponentId: null };
  }
  const o = row as Record<string, unknown>;
  const matched = o.matched === true || o.matched === "t" || o.matched === "true";
  const rawDuel = o.duel_id ?? o.duelId;
  const rawOpp = o.opponent_id ?? o.opponentId;
  const duelId = typeof rawDuel === "string" ? rawDuel : null;
  const opponentId = typeof rawOpp === "string" ? rawOpp : null;
  return { matched, duelId, opponentId };
}

export async function joinDuelQueue(
  divisionKey: string
): Promise<
  | { success: true; state: "matched"; duelId: string }
  | { success: true; state: "waiting" }
  | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can join matchmaking." };
    }

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.duelQueueJoin,
      "duel queue"
    );

    const allowed = assertAllowedArenaDivisionKey(divisionKey);
    if (!allowed.ok) {
      return { success: false, error: allowed.error };
    }

    const admin = createAdminClient();

    const { data: mySettings } = await admin
      .from("user_settings")
      .select("duel_opt_in")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!mySettings?.duel_opt_in) {
      return {
        success: false,
        error: "Enable skill duels in Settings to use matchmaking.",
      };
    }

    const { data: div } = await admin
      .from("divisions")
      .select("key")
      .eq("key", allowed.key)
      .eq("active", true)
      .maybeSingle();

    if (!div) {
      return { success: false, error: "Invalid division." };
    }

    const { data: rpcData, error: rpcErr } = await admin.rpc(
      "duel_queue_join_and_match",
      {
        p_joiner: user.id,
        p_division_key: div.key,
      }
    );

    if (rpcErr) {
      const msg = rpcErr.message ?? "";
      if (msg.includes("invalid_division")) {
        return { success: false, error: "Invalid division." };
      }
      return { success: false, error: msg || "Matchmaking failed." };
    }

    const { matched, duelId } = parseDuelQueueJoinRpc(rpcData);

    if (matched && duelId) {
      const started = await instantStartQueueMatch(duelId);
      revalidatePath("/student/duel");
      if (!started.success) {
        // Match exists; client can still open / retry activate.
        return { success: true, state: "matched", duelId };
      }
      return { success: true, state: "matched", duelId };
    }

    revalidatePath("/student/duel");
    return { success: true, state: "waiting" };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Matchmaking failed.",
    };
  }
}

export async function leaveDuelQueue(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can leave the queue." };
    }

    const admin = createAdminClient();
    const { error } = await admin.from("duel_queue").delete().eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/student/duel");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to leave queue.",
    };
  }
}

export async function pollDuelQueue(divisionKey: string): Promise<
  | { state: "waiting" }
  | { state: "matched"; duelId: string }
  | { state: "idle" }
> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { state: "idle" };
    }

    const admin = createAdminClient();
    const key = divisionKey.trim();

    const { data: qrow } = await admin
      .from("duel_queue")
      .select("division_key")
      .eq("user_id", user.id)
      .maybeSingle();

    const queuedKey =
      typeof qrow?.division_key === "string" ? qrow.division_key.trim() : "";

    if (queuedKey) {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { data: duelQueued } = await admin
        .from("skill_duels")
        .select("id")
        .eq("match_source", "queue")
        .in("status", ["pending", "active"])
        .eq("division_key", queuedKey)
        .gte("created_at", since)
        .or(`student_id.eq.${user.id},opponent_student_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (duelQueued?.id) {
        return { state: "matched", duelId: duelQueued.id };
      }

      return { state: "waiting" };
    }

    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: duel } = await admin
      .from("skill_duels")
      .select("id")
      .eq("match_source", "queue")
      .in("status", ["pending", "active"])
      .eq("division_key", key)
      .gte("created_at", since)
      .or(`student_id.eq.${user.id},opponent_student_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (duel?.id) {
      return { state: "matched", duelId: duel.id };
    }

    return { state: "idle" };
  } catch {
    return { state: "idle" };
  }
}

export async function declineQueueMatch(
  duelId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can decline a match." };
    }

    const id = parseUUID(duelId);
    if (!id.ok) return { success: false, error: "Invalid duel." };

    const admin = createAdminClient();
    const { data: duel, error: fetchErr } = await admin
      .from("skill_duels")
      .select("id, student_id, opponent_student_id, status, match_source, is_ai_opponent")
      .eq("id", id.id)
      .maybeSingle();

    if (fetchErr || !duel) {
      return { success: false, error: "Duel not found." };
    }

    const ms = duel.match_source as string | null;
    if (!isQueueStyleMatchSource(ms)) {
      return { success: false, error: "Not a queue match." };
    }

    if (duel.status !== "pending") {
      return { success: false, error: "This match is no longer pending." };
    }

    const isAi = duel.is_ai_opponent === true;
    const isParticipant =
      duel.student_id === user.id || (!isAi && duel.opponent_student_id === user.id);
    if (!isParticipant) {
      return { success: false, error: "Not a participant." };
    }

    const { error } = await admin
      .from("skill_duels")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id.id)
      .eq("status", "pending");

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/student/duel");
    revalidatePath(`/student/duel/${id.id}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to decline match.",
    };
  }
}
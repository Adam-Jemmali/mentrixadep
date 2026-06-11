"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { parseUUID, enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/shared/core/security";
import { trackEvent } from "@/shared/integrations/analytics";

import { insertPendingSkillDuel } from "@/features/duels/duel-internal";

export async function createSkillDuel(
  opponentStudentId: string,
  divisionKey: string
): Promise<{ success: true; duelId: string } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    if (user.role !== "student") {
      return { success: false, error: "Only students can start a duel." };
    }

    const oid = parseUUID(opponentStudentId);
    if (!oid.ok) return { success: false, error: "Invalid opponent." };
    if (oid.id === user.id) {
      return { success: false, error: "You cannot duel yourself." };
    }

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.duelCreate,
      "create duel"
    );

    const admin = createAdminClient();

    const { data: opponentUser } = await admin
      .from("users")
      .select("id, role, approved")
      .eq("id", oid.id)
      .eq("role", "student")
      .eq("approved", true)
      .maybeSingle();

    if (!opponentUser) {
      return { success: false, error: "Learner not found or not eligible." };
    }

    const { data: opponentSettings } = await admin
      .from("user_settings")
      .select("duel_opt_in")
      .eq("user_id", oid.id)
      .maybeSingle();

    if (!opponentSettings?.duel_opt_in) {
      return {
        success: false,
        error:
          "This learner has not enabled skill duel challenges in Settings.",
      };
    }

    const { data: div } = await admin
      .from("divisions")
      .select("key, name")
      .eq("key", divisionKey.trim())
      .eq("active", true)
      .maybeSingle();

    if (!div) {
      return { success: false, error: "Invalid division." };
    }

    const ins = await insertPendingSkillDuel(
      admin,
      user.id,
      oid.id,
      div.key,
      "direct"
    );
    if (!ins.ok) {
      return { success: false, error: ins.message };
    }

    void trackEvent("duel_challenged", {
      userId: user.id,
      properties: { division_key: div.key, opponent_id: oid.id },
    });

    revalidatePath("/student/duel");
    return { success: true, duelId: ins.duelId };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create duel.",
    };
  }
}
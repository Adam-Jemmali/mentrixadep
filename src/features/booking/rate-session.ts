"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  validateUUID,
  validateRating,
  validateComment,
  sanitizeError,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/shared/core/security";
import { applyXpAward } from "@/features/xp/xp-awards";
import { autoGenerateStudioPackagesForCompletedSessions } from "@/features/studio-ai/studio-packages";
import { XP } from "@/features/xp/xp-constants";
import { getDivisionKeyForCourse } from "@/features/divisions/leaderboard";
import { AP_CALC_AB_DIVISION_KEY } from "@/features/divisions/ap-calc-ab-division";

export async function rateSession(
  sessionId: string,
  rating: number,
  comment?: string,
  onBehalfOfUserId?: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "admin"]);
    const adminClient = createAdminClient();

    const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.rateSession,
      "rate session"
    );

    const validSessionId = validateUUID(sessionId);
    const validRating = validateRating(rating);
    const validComment = validateComment(comment);

    const { data: session, error: sessionError } = await adminClient
      .from("sessions")
      .select("*")
      .eq("id", validSessionId)
      .eq("student_id", actingAsId)
      .single();

    if (sessionError || !session) {
      return { success: false, error: "Session not found or you don't have permission" };
    }

    if (new Date(session.start_time) > new Date()) {
      return { success: false, error: "Cannot rate future session" };
    }

    const sessionEnd = new Date(session.end_time);
    const now = new Date();
    const st = String(session.status ?? "").toLowerCase();
    const markedCompleteEarly = st === "completed" || session.completed === true;
    if (sessionEnd > now && !markedCompleteEarly) {
      return { success: false, error: "Cannot rate session before it ends" };
    }

    if (!session.tutor_id) {
      return { success: false, error: "Session is missing tutor information" };
    }

    if (st === "cancelled") {
      return { success: false, error: "Cancelled sessions cannot be rated." };
    }

    // DB trigger validate_rating_session requires sessions.completed = true before insert.
    // Mark complete whenever the row is not completed yet (fixes status/completed mismatch).
    if (!session.completed) {
      const { error: completeErr } = await adminClient
        .from("sessions")
        .update({ completed: true, status: "completed" })
        .eq("id", validSessionId);

      if (completeErr) {
        return {
          success: false,
          error: `Could not finalize session before rating: ${completeErr.message}`,
        };
      }

      try {
        await autoGenerateStudioPackagesForCompletedSessions([validSessionId]);
      } catch (pkgErr) {
        console.error("[rateSession] studio package trigger failed", validSessionId, pkgErr);
      }
    }

    const { data: existingRating, error: checkError } = await adminClient
      .from("ratings")
      .select("id")
      .eq("session_id", validSessionId)
      .eq("student_id", actingAsId)
      .maybeSingle();

    if (checkError) {
      return { success: false, error: `Failed to check existing rating: ${checkError.message}` };
    }

    if (existingRating) {
      const { error: updateError } = await adminClient
        .from("ratings")
        .update({ rating: validRating, comment: validComment ?? null })
        .eq("id", existingRating.id);

      if (updateError) {
        return { success: false, error: `Failed to update rating: ${updateError.message}` };
      }
    } else {
      const { error: insertError } = await adminClient
        .from("ratings")
        .insert({
          session_id: validSessionId,
          student_id: actingAsId,
          tutor_id: session.tutor_id,
          rating: validRating,
          comment: validComment ?? null,
        });

      if (insertError) {
        return { success: false, error: `Failed to create rating: ${insertError.message}` };
      }

      const divisionKey = session.course
        ? (await getDivisionKeyForCourse(session.course)) ?? AP_CALC_AB_DIVISION_KEY
        : AP_CALC_AB_DIVISION_KEY;
      try {
        await applyXpAward(
          actingAsId,
          XP.SESSION_RATE,
          `session_rate:${validSessionId}`,
          divisionKey,
        );
      } catch {
        // XP award is best-effort
      }
    }

    revalidatePath("/student");
    return { success: true };
  } catch (error) {
    return { success: false, error: sanitizeError(error) };
  }
}

export async function canRateSession(sessionId: string) {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const { data: session, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("student_id", user.id)
    .single();

  if (error || !session) {
    return { canRate: false, reason: "Session not found" };
  }

  const sessionEnd = new Date(session.end_time);
  const now = new Date();
  const markedCompleteEarly =
    session.status === "completed" || session.completed === true;

  if (sessionEnd > now && !markedCompleteEarly) {
    return { canRate: false, reason: "Session has not ended yet" };
  }

  if (session.status === "cancelled") {
    return { canRate: false, reason: "Cancelled sessions cannot be rated" };
  }

  return { canRate: true };
}

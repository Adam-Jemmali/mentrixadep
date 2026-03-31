"use server";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { revalidatePath } from "next/cache";
import {
  parseUUID,
  sanitizeError,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/lib/security";

type SessionRow = {
  id: string;
  student_id: string;
  tutor_id: string;
  end_time: string;
  status: string;
  completed: boolean;
};

/**
 * Remove a past session row. Cascades to ratings, video rooms, recordings, AI packages, etc.
 * Only the student or tutor on the session may delete; admins must pass onBehalfOfUserId.
 *
 * Loads the row with the user-scoped client first (same visibility as the dashboard), then
 * falls back to the service role so deletes still work if the service key is misconfigured
 * but RLS allows the operation.
 */
export async function deletePastSession(
  sessionId: string,
  onBehalfOfUserId?: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireRole(["student", "tutor", "admin"]);

    if (user.role === "admin" && !onBehalfOfUserId) {
      return {
        success: false,
        error: "Choose a user to act on behalf of before deleting a session.",
      };
    }

    const actingAsId =
      user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.deletePastSession,
      "delete past session"
    );

    const parsed = parseUUID(sessionId);
    if (!parsed.ok) {
      return { success: false, error: "Invalid session ID." };
    }
    const validId = parsed.id;

    const isAdminOnBehalf = user.role === "admin" && !!onBehalfOfUserId;
    const userSb = await createClient();
    const adminSb = env.server.supabaseServiceRoleKey ? createAdminClient() : null;

    const { session, loadError } = await loadSessionRow(
      validId,
      userSb,
      adminSb,
      isAdminOnBehalf
    );

    if (!session) {
      return {
        success: false,
        error: loadError
          ? `Could not load this session. ${loadError}`
          : "Session not found or you no longer have access to it.",
      };
    }

    const endMs = new Date(session.end_time).getTime();
    const endedBySchedule = endMs < Date.now();
    const finishedOutOfBand =
      session.status === "completed" ||
      session.status === "cancelled" ||
      session.completed === true;
    if (!endedBySchedule && !finishedOutOfBand) {
      return {
        success: false,
        error:
          "Only finished sessions can be removed. Cancel upcoming sessions where allowed, or wait until the tutor marks the session complete or the scheduled end passes.",
      };
    }

    const isStudent = session.student_id === actingAsId;
    const isTutor = session.tutor_id === actingAsId;
    if (!isStudent && !isTutor) {
      return {
        success: false,
        error: "You can only delete sessions you took part in.",
      };
    }

    const del = await deleteSessionRow(validId, userSb, adminSb, isAdminOnBehalf);
    if (!del.ok) {
      return { success: false, error: del.error };
    }

    revalidatePath("/student");
    revalidatePath("/tutor");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: sanitizeError(error) };
  }
}

async function loadSessionRow(
  validId: string,
  userSb: Awaited<ReturnType<typeof createClient>>,
  adminSb: ReturnType<typeof createAdminClient> | null,
  preferAdminFirst: boolean
): Promise<{ session: SessionRow | null; loadError: string | null }> {
  const selectCols = "id, student_id, tutor_id, end_time, status, completed";

  const fromUser = async () => {
    const { data, error } = await userSb
      .from("sessions")
      .select(selectCols)
      .eq("id", validId)
      .maybeSingle();
    return {
      row: (data as SessionRow | null) ?? null,
      err: error?.message ?? null,
    };
  };

  const fromAdmin = async () => {
    if (!adminSb) return { row: null as SessionRow | null, err: null as string | null };
    const { data, error } = await adminSb
      .from("sessions")
      .select(selectCols)
      .eq("id", validId)
      .maybeSingle();
    return {
      row: (data as SessionRow | null) ?? null,
      err: error?.message ?? null,
    };
  };

  if (preferAdminFirst) {
    const a = await fromAdmin();
    if (a.row) return { session: a.row, loadError: null };
    const u = await fromUser();
    if (u.row) return { session: u.row, loadError: null };
    return {
      session: null,
      loadError: a.err || u.err,
    };
  }

  const u = await fromUser();
  if (u.row) return { session: u.row, loadError: null };
  const a = await fromAdmin();
  if (a.row) return { session: a.row, loadError: null };

  return {
    session: null,
    loadError: u.err || a.err,
  };
}

async function deleteSessionRow(
  validId: string,
  userSb: Awaited<ReturnType<typeof createClient>>,
  adminSb: ReturnType<typeof createAdminClient> | null,
  isAdminOnBehalf: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isAdminOnBehalf && !adminSb) {
    return {
      ok: false,
      error:
        "Removing a session on behalf of a user requires SUPABASE_SERVICE_ROLE_KEY to be configured on the server.",
    };
  }

  if (adminSb) {
    const { error } = await adminSb.from("sessions").delete().eq("id", validId);
    if (!error) return { ok: true };
    if (isAdminOnBehalf) {
      return {
        ok: false,
        error: `Could not remove session (admin): ${error.message}`,
      };
    }
  }

  const { error: userErr } = await userSb.from("sessions").delete().eq("id", validId);
  if (!userErr) return { ok: true };

  const hint =
    !adminSb && !isAdminOnBehalf
      ? " Ensure SUPABASE_SERVICE_ROLE_KEY is set on the server, or that past-session delete RLS policies are applied."
      : "";

  return {
    ok: false,
    error: `Could not remove session: ${userErr.message}.${hint}`,
  };
}

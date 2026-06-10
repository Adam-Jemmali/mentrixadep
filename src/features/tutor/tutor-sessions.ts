"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { createPayoutLedgerForSession } from "@/features/payments/payout-ledger";
import { autoGenerateStudioPackagesForCompletedSessions } from "@/features/studio-ai/studio-packages";
import type { Session } from "@/shared/types/database";
import { validateUUID } from "@/shared/core/security";
import {
  isMissingCancelledSessionColumnsError,
  isMissingSessionHideColumnsError,
  enrichTutorRowsWithStudentProfiles,
} from "@/features/tutor/tutor-internal";

export async function getUpcomingSessions() {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("tutor_id", user.id)
    .eq("status", "scheduled")
    .gte("end_time", nowIso)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch upcoming sessions: ${error.message}`);
  }

  const sessions = data || [];
  return enrichTutorRowsWithStudentProfiles(sessions);
}

export async function getPastSessions(limit = 50) {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  let endedRows: Session[] | null = null;
  let closedEarlyRows: Session[] | null = null;
  let endedErr: { message?: string } | null = null;
  let earlyErr: { message?: string } | null = null;

  {
    const [endedRes, earlyRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .eq("tutor_id", user.id)
        .is("tutor_hidden_at", null)
        .lt("end_time", nowIso)
        .order("end_time", { ascending: false })
        .limit(safeLimit),
      supabase
        .from("sessions")
        .select("*")
        .eq("tutor_id", user.id)
        .is("tutor_hidden_at", null)
        .in("status", ["completed", "cancelled"])
        .gte("end_time", nowIso)
        .order("end_time", { ascending: false })
        .limit(safeLimit),
    ]);
    endedRows = endedRes.data;
    closedEarlyRows = earlyRes.data;
    endedErr = endedRes.error;
    earlyErr = earlyRes.error;
  }

  // Backward compatibility: render safely before migration 057 is applied.
  if (isMissingSessionHideColumnsError(endedErr) || isMissingSessionHideColumnsError(earlyErr)) {
    const [endedRes, earlyRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .eq("tutor_id", user.id)
        .lt("end_time", nowIso)
        .order("end_time", { ascending: false })
        .limit(safeLimit),
      supabase
        .from("sessions")
        .select("*")
        .eq("tutor_id", user.id)
        .in("status", ["completed", "cancelled"])
        .gte("end_time", nowIso)
        .order("end_time", { ascending: false })
        .limit(safeLimit),
    ]);
    endedRows = endedRes.data;
    closedEarlyRows = earlyRes.data;
    endedErr = endedRes.error;
    earlyErr = earlyRes.error;
  }

  if (endedErr || earlyErr) {
    throw new Error(`Failed to fetch past sessions: ${endedErr?.message || earlyErr?.message}`);
  }

  const byId = new Map<string, NonNullable<typeof endedRows>[number]>();
  for (const row of [...(endedRows ?? []), ...(closedEarlyRows ?? [])]) {
    byId.set(row.id, row);
  }
  const sessions = Array.from(byId.values())
    .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime())
    .slice(0, safeLimit);
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);
  const adminClient = createAdminClient();

  const [{ data: ratings }, { data: packageRows }] = await Promise.all([
    supabase
      .from("ratings")
      .select("session_id, rating")
      .in("session_id", sessionIds)
      .eq("tutor_id", user.id),
    adminClient
      .from("session_ai_packages")
      .select("session_id")
      .in("session_id", sessionIds),
  ]);

  const ratingBySession = new Map<string, number>();
  for (const r of ratings ?? []) {
    ratingBySession.set(r.session_id, r.rating);
  }

  const hasPackageBySession = new Set((packageRows ?? []).map((p) => p.session_id));
  const withProfiles = await enrichTutorRowsWithStudentProfiles(sessions);

  return withProfiles.map((session) => ({
    ...session,
    rating: ratingBySession.get(session.id) ?? null,
    hasAiPackage: hasPackageBySession.has(session.id),
  }));
}

export async function completeSession(sessionId: string, onBehalfOfUserId?: string) {
  const user = await requireRole(["tutor", "admin"]);
  let validSessionId: string;
  try {
    validSessionId = validateUUID(sessionId);
  } catch {
    throw new Error("Invalid session ID");
  }

  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client =
    user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

  const { data: session, error: sessionError } = await client
    .from("sessions")
    .select("id, tutor_id, status, completed")
    .eq("id", validSessionId)
    .eq("tutor_id", actingAsId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found or you don't have permission");
  }

  if (session.completed || session.status === "completed") {
    try {
      await createPayoutLedgerForSession(validSessionId);
    } catch (payoutError) {
      console.error("[completeSession] payout trigger failed for already-completed session", validSessionId, payoutError);
    }
    return { success: true };
  }

  const { error: updateError } = await client
    .from("sessions")
    .update({ status: "completed", completed: true })
    .eq("id", validSessionId)
    .eq("tutor_id", actingAsId);

  if (updateError) {
    throw new Error(`Failed to complete session: ${updateError.message}`);
  }

  try {
    await createPayoutLedgerForSession(validSessionId);
  } catch (payoutError) {
    console.error("[completeSession] payout trigger failed", validSessionId, payoutError);
  }

  try {
    await autoGenerateStudioPackagesForCompletedSessions([validSessionId]);
  } catch (pkgErr) {
    console.error("[completeSession] studio package trigger failed", validSessionId, pkgErr);
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  return { success: true };
}

export async function cancelSession(sessionId: string, onBehalfOfUserId?: string) {
  const user = await requireRole(["tutor", "admin"]);

  let validSessionId: string;
  try {
    validSessionId = validateUUID(sessionId);
  } catch {
    throw new Error("Invalid session ID");
  }

  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client =
    user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

  const { data: session, error: sessionError } = await client
    .from("sessions")
    .select("*")
    .eq("id", validSessionId)
    .eq("tutor_id", actingAsId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found or you don't have permission");
  }

  const cancelledAt = new Date().toISOString();
  let { error: updateError } = await client
    .from("sessions")
    .update({
      status: "cancelled",
      cancelled_at: cancelledAt,
      cancelled_by_role: "tutor",
    })
    .eq("id", validSessionId)
    .eq("tutor_id", actingAsId);

  if (updateError && isMissingCancelledSessionColumnsError(updateError)) {
    ({ error: updateError } = await client
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("id", validSessionId)
      .eq("tutor_id", actingAsId));
  }

  if (updateError) {
    throw new Error(`Failed to cancel session: ${updateError.message}`);
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  return { success: true };
}
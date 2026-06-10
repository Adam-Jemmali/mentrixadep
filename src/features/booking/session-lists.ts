"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import {
  enrichStudentSessionsWithTutorProfiles,
  isMissingSessionHideColumnsError,
  type StudentSessionTutorProfile,
} from "@/features/booking/booking-internal";
import type { Session, SessionAiPackage } from "@/shared/types/database";

export type { StudentSessionTutorProfile };

export async function getUpcomingSessions() {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", user.id)
    .eq("status", "scheduled")
    .gte("end_time", nowIso)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch upcoming sessions: ${error.message}`);
  }

  const rows = data || [];
  return enrichStudentSessionsWithTutorProfiles(rows);
}

export async function getPastSessions() {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  let endedRows: Session[] | null = null;
  let closedEarlyRows: Session[] | null = null;
  let endedErr: { message?: string } | null = null;
  let earlyErr: { message?: string } | null = null;

  {
    const [endedRes, earlyRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .eq("student_id", user.id)
        .is("student_hidden_at", null)
        .lt("end_time", nowIso),
      supabase
        .from("sessions")
        .select("*")
        .eq("student_id", user.id)
        .is("student_hidden_at", null)
        .in("status", ["completed", "cancelled"])
        .gte("end_time", nowIso),
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
        .eq("student_id", user.id)
        .lt("end_time", nowIso),
      supabase
        .from("sessions")
        .select("*")
        .eq("student_id", user.id)
        .in("status", ["completed", "cancelled"])
        .gte("end_time", nowIso),
    ]);
    endedRows = endedRes.data;
    closedEarlyRows = earlyRes.data;
    endedErr = endedRes.error;
    earlyErr = earlyRes.error;
  }

  if (endedErr || earlyErr) {
    throw new Error(
      `Failed to fetch past sessions: ${endedErr?.message || earlyErr?.message}`,
    );
  }

  const byId = new Map<string, NonNullable<typeof endedRows>[number]>();
  for (const row of [...(endedRows ?? []), ...(closedEarlyRows ?? [])]) {
    byId.set(row.id, row);
  }
  const sessions = Array.from(byId.values()).sort(
    (a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime(),
  );

  if (sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((s) => s.id);
  const [{ data: ratings }, withTutors] = await Promise.all([
    supabase
      .from("ratings")
      .select("*")
      .in("session_id", sessionIds)
      .eq("student_id", user.id),
    enrichStudentSessionsWithTutorProfiles(sessions),
  ]);

  const adminClient = createAdminClient();
  const { data: allPkgRows } = await adminClient
    .from("session_ai_packages")
    .select("*")
    .in("session_id", sessionIds);

  const pkgBySession = new Map<string, SessionAiPackage>();
  const draftPackageSessionIds = new Set<string>();
  for (const p of allPkgRows ?? []) {
    const row = p as SessionAiPackage;
    if (row.package_published_at) {
      pkgBySession.set(row.session_id, row);
    } else {
      draftPackageSessionIds.add(row.session_id);
    }
  }

  return withTutors.map((session) => ({
    ...session,
    ratings: (ratings || []).filter((r) => r.session_id === session.id),
    ai_package: pkgBySession.get(session.id) ?? null,
    has_studio_package_draft: draftPackageSessionIds.has(session.id),
  }));
}

export async function getSessionRequests() {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_requests")
    .select(`
      *,
      availability:availability_id (
        course,
        start_time,
        end_time
      )
    `)
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch session requests: ${error.message}`);
  }

  const rows = data || [];
  return enrichStudentSessionsWithTutorProfiles(rows);
}

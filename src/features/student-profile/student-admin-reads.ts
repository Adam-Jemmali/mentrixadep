"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { enrichStudentSessionsWithTutorProfiles } from "@/features/booking/booking-internal";
import type { SessionAiPackage } from "@/shared/types/database";

export async function getStudentDashboardForAdmin(studentId: string) {
  await requireRole(["admin"]);
  const adminClient = createAdminClient();

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(studentId)) return null;

  const { data: studentUser, error: userError } = await adminClient
    .from("users")
    .select("id, role, approved")
    .eq("id", studentId)
    .eq("role", "student")
    .maybeSingle();

  if (userError || !studentUser) return null;

  const { data: authUser } = await adminClient.auth.admin.getUserById(studentId);
  const email = authUser?.user?.email ?? "";

  const now = new Date().toISOString();

  const [
    upcomingResult,
    pastEndedResult,
    pastEarlyResult,
    xpResult,
    availResult,
    courseResult,
  ] = await Promise.all([
    adminClient
      .from("sessions")
      .select("*")
      .eq("student_id", studentId)
      .eq("status", "scheduled")
      .gte("end_time", now)
      .order("start_time", { ascending: true }),
    adminClient.from("sessions").select("*").eq("student_id", studentId).lt("end_time", now).order("end_time", { ascending: false }).limit(50),
    adminClient
      .from("sessions")
      .select("*")
      .eq("student_id", studentId)
      .in("status", ["completed", "cancelled"])
      .gte("end_time", now)
      .order("end_time", { ascending: false })
      .limit(50),
    adminClient
      .from("user_xp")
      .select("total_xp, streak_days")
      .eq("user_id", studentId)
      .maybeSingle(),
    adminClient
      .from("availability")
      .select("*")
      .eq("active", true)
      .gte("start_time", now)
      .order("start_time", { ascending: true })
      .limit(100),
    adminClient
      .from("availability")
      .select("course")
      .eq("active", true)
      .gte("start_time", now)
      .order("course", { ascending: true })
      .limit(200),
  ]);

  const pastById = new Map<string, NonNullable<typeof pastEndedResult.data>[number]>();
  for (const row of [
    ...(pastEndedResult.data ?? []),
    ...(pastEarlyResult.data ?? []),
  ]) {
    if (row) pastById.set(row.id, row);
  }
  const pastSessionsRaw = Array.from(pastById.values()).sort(
    (a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime(),
  );
  const sessionIds = pastSessionsRaw.map((s) => s.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ratings: any[] = [];
  if (sessionIds.length > 0) {
    const { data: ratingsData } = await adminClient
      .from("ratings")
      .select("*")
      .in("session_id", sessionIds)
      .eq("student_id", studentId);
    ratings = ratingsData ?? [];
  }

  const [upcomingSessions, pastWithTutors] = await Promise.all([
    enrichStudentSessionsWithTutorProfiles(upcomingResult.data ?? []),
    enrichStudentSessionsWithTutorProfiles(pastSessionsRaw),
  ]);

  const { data: allPkgRowsAdmin } =
    sessionIds.length > 0
      ? await adminClient.from("session_ai_packages").select("*").in("session_id", sessionIds)
      : { data: [] as SessionAiPackage[] };

  const pkgBySessionAdmin = new Map<string, SessionAiPackage>();
  const draftPackageSessionIdsAdmin = new Set<string>();
  for (const p of allPkgRowsAdmin ?? []) {
    const row = p as SessionAiPackage;
    if (row.package_published_at) {
      pkgBySessionAdmin.set(row.session_id, row);
    } else {
      draftPackageSessionIdsAdmin.add(row.session_id);
    }
  }

  const pastSessions = pastWithTutors.map((s) => ({
    ...s,
    ratings: ratings.filter((r) => r.session_id === s.id),
    ai_package: pkgBySessionAdmin.get(s.id) ?? null,
    has_studio_package_draft: draftPackageSessionIdsAdmin.has(s.id),
  }));

  const totalXp = xpResult.data?.total_xp ?? 0;
  const streak = xpResult.data?.streak_days ?? 0;

  const approvedTutorIds = new Set<string>();
  const tutorIds = Array.from(new Set((availResult.data ?? []).map((a) => a.tutor_id)));
  if (tutorIds.length > 0) {
    const { data: tutors } = await adminClient
      .from("users")
      .select("id, role, approved")
      .in("id", tutorIds)
      .eq("approved", true);
    (tutors ?? []).forEach((t) => approvedTutorIds.add(t.id));
  }

  const tutorEmailMap: Record<string, string> = {};
  await Promise.all(
    Array.from(approvedTutorIds).map(async (tid) => {
      try {
        const { data: ad } = await adminClient.auth.admin.getUserById(tid);
        if (ad?.user?.email) tutorEmailMap[tid] = ad.user.email;
      } catch { /* best-effort */ }
    }),
  );

  const availability = (availResult.data ?? [])
    .filter((a) => approvedTutorIds.has(a.tutor_id))
    .map((a) => ({
      ...a,
      tutor: {
        id: a.tutor_id,
        role: "tutor" as const,
        approved: true,
        email: tutorEmailMap[a.tutor_id] ?? "",
      },
    }));

  const courses = Array.from(
    new Set((courseResult.data ?? []).map((a) => a.course)),
  ).sort();

  const { data: userSettingsRow } = await adminClient
    .from("user_settings")
    .select("timezone")
    .eq("user_id", studentId)
    .maybeSingle();

  const displayTimeZone =
    typeof userSettingsRow?.timezone === "string" && userSettingsRow.timezone.trim().length > 0
      ? userSettingsRow.timezone.trim()
      : "UTC";

  return {
    studentId,
    email,
    upcomingSessions,
    pastSessions,
    availability,
    courses,
    totalXp,
    streak,
    displayTimeZone,
  };
}

"use server";

import { requireAuth, requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getUserSettings } from "@/features/settings/user-settings";
import { normalizeTeachingDefaultDurationMinutes } from "@/features/tutor/teaching-defaults";

async function fetchTutorPublicProfileUncached(tutorId: string) {
  const adminClient = createAdminClient();

  // Validate tutorId is a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tutorId)) {
    return null;
  }

  // Fetch tutor user record
  const { data: tutorUser, error: userError } = await adminClient
    .from("users")
    .select("id, role, approved")
    .eq("id", tutorId)
    .eq("role", "tutor")
    .eq("approved", true)
    .maybeSingle();

  if (userError || !tutorUser) {
    return null;
  }

  // Fetch email from auth.users
  const { data: authUser } = await adminClient.auth.admin.getUserById(tutorId);
  const email = authUser?.user?.email ?? "";
  const name = authUser?.user?.user_metadata?.full_name
    ?? authUser?.user?.user_metadata?.name
    ?? email.split("@")[0];

  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + 14);

  // Fetch available slots (next 14 days — matches learner booking window)
  const { data: slots } = await adminClient
    .from("availability")
    .select("id, course, start_time, end_time, price_per_session")
    .eq("tutor_id", tutorId)
    .eq("active", true)
    .or("booking_status.eq.available,booking_status.is.null")
    .gte("start_time", new Date().toISOString())
    .lte("start_time", windowEnd.toISOString())
    .order("start_time", { ascending: true });

  const availability = slots ?? [];

  // Distinct courses from available slots
  const courses = Array.from(new Set(availability.map((s) => s.course))).sort();

  // Session count and ratings
  const { data: sessions } = await adminClient
    .from("sessions")
    .select("id")
    .eq("tutor_id", tutorId)
    .eq("status", "completed");

  const sessionCount = sessions?.length ?? 0;

  const { data: ratingsRaw } = await adminClient
    .from("ratings")
    .select("rating, comment, created_at")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });

  const ratingList = ratingsRaw?.map((r) => r.rating) ?? [];
  const avgRating =
    ratingList.length > 0
      ? ratingList.reduce((sum, r) => sum + r, 0) / ratingList.length
      : null;

  // Per-star distribution (5 down to 1)
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratingList.filter((r) => r === star).length,
  }));

  // Last 5 reviews with comments
  const reviews = (ratingsRaw ?? []).slice(0, 5).map((r) => ({
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
  }));

  // Auto-approve status
  const { data: tutorMeta } = await adminClient
    .from("users")
    .select("auto_approve")
    .eq("id", tutorId)
    .maybeSingle();

  const autoApprove = (tutorMeta as { auto_approve?: boolean } | null)?.auto_approve ?? false;

  const { data: tutorSettingsRow } = await adminClient
    .from("user_settings")
    .select("timezone, bio")
    .eq("user_id", tutorId)
    .maybeSingle();

  const tutorTimezone =
    typeof tutorSettingsRow?.timezone === "string" && tutorSettingsRow.timezone.trim().length > 0
      ? tutorSettingsRow.timezone.trim()
      : "UTC";

  const bioRaw = tutorSettingsRow?.bio;
  const bio =
    typeof bioRaw === "string" && bioRaw.trim().length > 0 ? bioRaw.trim() : null;

  return {
    id: tutorId,
    email,
    name,
    sessionCount,
    avgRating,
    ratingCount: ratingList.length,
    ratingDistribution,
    reviews,
    courses,
    availability,
    autoApprove,
    tutorTimezone,
    bio,
  };
}

export async function getTutorPublicProfile(tutorId: string) {
  const profile = await fetchTutorPublicProfileUncached(tutorId);
  if (!profile) return null;

  const user = await requireAuth();
  if (user.id === tutorId) {
    const settings = await getUserSettings();
    return { ...profile, privateSettings: settings };
  }

  return profile;
}

export async function getTutorDashboardForAdmin(tutorId: string) {
  await requireRole(["admin"]);
  const adminClient = createAdminClient();

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tutorId)) return null;

  const { data: tutorUser } = await adminClient
    .from("users")
    .select("id, role, approved, auto_approve")
    .eq("id", tutorId)
    .eq("role", "tutor")
    .maybeSingle();

  if (!tutorUser) return null;

  const now = new Date().toISOString();

  const [availResult, upcomingResult, pastResult, reqAvailResult, tutorCoursesResult, tzResult] =
    await Promise.all([
      adminClient
        .from("availability")
        .select("*")
        .eq("tutor_id", tutorId)
        .gte("start_time", now)
        .order("start_time", { ascending: true }),
      adminClient
        .from("sessions")
        .select("*")
        .eq("tutor_id", tutorId)
        .neq("status", "cancelled")
        .gte("end_time", now)
        .order("start_time", { ascending: true }),
      adminClient
        .from("sessions")
        .select("*")
        .eq("tutor_id", tutorId)
        .lt("end_time", now)
        .order("end_time", { ascending: false }),
      adminClient
        .from("availability")
        .select("id")
        .eq("tutor_id", tutorId),
      adminClient
        .from("tutor_courses")
        .select("*")
        .eq("tutor_id", tutorId)
        .order("created_at", { ascending: true }),
      adminClient
        .from("user_settings")
        .select("timezone, session_default_duration")
        .eq("user_id", tutorId)
        .maybeSingle(),
    ]);

  const availabilityRaw = availResult.data ?? [];
  let availability = availabilityRaw;
  const availIdsForCount = availabilityRaw.map((a) => a.id);
  if (availIdsForCount.length > 0) {
    const { data: pendingRows } = await adminClient
      .from("session_requests")
      .select("availability_id")
      .in("availability_id", availIdsForCount)
      .eq("status", "pending");
    const count = new Map<string, number>();
    for (const p of pendingRows ?? []) {
      const aid = p.availability_id as string;
      count.set(aid, (count.get(aid) ?? 0) + 1);
    }
    availability = availabilityRaw.map((a) => ({
      ...a,
      pending_booking_count: count.get(a.id) ?? 0,
    }));
  } else {
    availability = [];
  }
  const upcomingSessions = upcomingResult.data ?? [];
  const pastSessions = pastResult.data ?? [];

  const sessionIds = pastSessions.map((s) => s.id);
  const ratingBySession = new Map<string, number>();
  const hasPackageBySession = new Set<string>();
  if (sessionIds.length > 0) {
    const [{ data: ratings }, { data: packageRows }] = await Promise.all([
      adminClient
        .from("ratings")
        .select("session_id, rating")
        .in("session_id", sessionIds)
        .eq("tutor_id", tutorId),
      adminClient
        .from("session_ai_packages")
        .select("session_id")
        .in("session_id", sessionIds),
    ]);
    for (const r of ratings ?? []) {
      ratingBySession.set(r.session_id, r.rating);
    }
    for (const p of packageRows ?? []) {
      hasPackageBySession.add(p.session_id);
    }
  }

  const availabilityIds = (reqAvailResult.data ?? []).map((a) => a.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sessionRequests: any[] = [];
  if (availabilityIds.length > 0) {
    const { data: reqs } = await adminClient
      .from("session_requests")
      .select("*, availability:availability(*)")
      .in("availability_id", availabilityIds)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    sessionRequests = reqs ?? [];
  }

  const allStudentIds = Array.from(new Set([
    ...upcomingSessions.map((s) => s.student_id),
    ...pastSessions.map((s) => s.student_id),
    ...sessionRequests.map((r: { student_id: string }) => r.student_id),
  ]));
  const emailMap: Record<string, string> = {};
  await Promise.all(
    allStudentIds.map(async (sid) => {
      try {
        const { data: authData } = await adminClient.auth.admin.getUserById(sid);
        if (authData?.user?.email) emailMap[sid] = authData.user.email;
      } catch { /* best-effort */ }
    }),
  );

  return {
    tutorId,
    availability,
    upcomingSessions: upcomingSessions.map((s) => ({
      ...s,
      student: { id: s.student_id },
      student_email: emailMap[s.student_id] ?? null,
    })),
    pastSessions: pastSessions.map((s) => ({
      ...s,
      student: { id: s.student_id },
      student_email: emailMap[s.student_id] ?? null,
      rating: ratingBySession.get(s.id) ?? null,
      hasAiPackage: hasPackageBySession.has(s.id),
    })),
    sessionRequests: sessionRequests.map((r: { student_id: string;[key: string]: unknown }) => ({
      ...r,
      student_email: emailMap[r.student_id] ?? null,
    })),
    autoApprove: tutorUser.auto_approve ?? false,
    tutorCourses: tutorCoursesResult.data ?? [],
    tutorTimezone:
      typeof tzResult.data?.timezone === "string" && tzResult.data.timezone.length > 0
        ? tzResult.data.timezone
        : "UTC",
    sessionDefaultDurationMinutes: normalizeTeachingDefaultDurationMinutes(
      tzResult.data?.session_default_duration,
    ),
  };
}
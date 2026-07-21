"use server";

import { requireAuth, requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { getUserSettings } from "@/features/settings/user-settings";
import { getGuideBreakthroughs } from "@/features/guide-rank/reads";
import { averageImpactScore } from "@/features/guide-rank/calculate-pure";
import { loadGuidePortfolioForPublic } from "@/features/guide-portfolio/reads";
import { normalizeTeachingDefaultDurationMinutes } from "@/features/tutor/teaching-defaults";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { isE2ESyntheticAccount } from "@/shared/core/e2e-synthetic-account-pure";

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
    .select("id, role, approved, guide_rank")
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

  const { data: settingsRow } = await adminClient
    .from("user_settings")
    .select("display_name")
    .eq("user_id", tutorId)
    .maybeSingle();
  if (
    isE2ESyntheticAccount({
      email,
      displayName:
        (typeof settingsRow?.display_name === "string" && settingsRow.display_name.trim()) ||
        (typeof name === "string" ? name : null),
    })
  ) {
    return null;
  }

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
    .select("timezone, bio, display_name, avatar_url")
    .eq("user_id", tutorId)
    .maybeSingle();

  const displayName =
    (typeof tutorSettingsRow?.display_name === "string" && tutorSettingsRow.display_name.trim()) ||
    (typeof name === "string" ? name : "Guide");

  const avatarUrl =
    typeof tutorSettingsRow?.avatar_url === "string" && tutorSettingsRow.avatar_url.trim().length > 0
      ? tutorSettingsRow.avatar_url.trim()
      : null;

  const tutorTimezone =
    typeof tutorSettingsRow?.timezone === "string" && tutorSettingsRow.timezone.trim().length > 0
      ? tutorSettingsRow.timezone.trim()
      : "UTC";

  const bioRaw = tutorSettingsRow?.bio;
  const bio =
    typeof bioRaw === "string" && bioRaw.trim().length > 0 ? bioRaw.trim() : null;

  const { data: impactRows } = await adminClient
    .from("guide_impact_scores")
    .select("subject, impact_score, sessions_counted")
    .eq("guide_id", tutorId)
    .order("impact_score", { ascending: false });

  const impactScores = (impactRows ?? []).map((row) => ({
    subject: row.subject,
    impactScore: Number(row.impact_score),
    sessionsCounted: row.sessions_counted,
  }));

  const { data: impactNodeRows } = await adminClient
    .from("mv_guide_impact_by_node")
    .select(
      "skill_node_id, node_name, subject, impact_score, students_counted, after_accuracy, before_accuracy, impact_lift",
    )
    .eq("guide_id", tutorId)
    .order("impact_score", { ascending: false })
    .limit(6);

  const impactNodeScores = (impactNodeRows ?? []).map((row) => ({
    skillNodeId: row.skill_node_id as string,
    nodeName: row.node_name as string,
    subject: row.subject as string,
    impactScore: Number(row.impact_score),
    studentsCounted: row.students_counted as number,
    afterAccuracy: Number(row.after_accuracy),
    beforeAccuracy: Number(row.before_accuracy),
    impactLift: Number(row.impact_lift),
  }));

  const avgImpactScore = averageImpactScore(impactScores);

  const { data: tutorCourseRows } = await adminClient
    .from("tutor_courses")
    .select("course_name")
    .eq("tutor_id", tutorId)
    .eq("verified", true);

  const allSubjects = Array.from(
    new Set([
      ...courses,
      ...(tutorCourseRows ?? []).map((r) => r.course_name),
      ...impactScores.map((i) => i.subject),
    ]),
  )
    .filter(isApCalculusAbSubject)
    .sort();

  let responseRatePercent: number | null = null;
  const { data: availIds } = await adminClient
    .from("availability")
    .select("id")
    .eq("tutor_id", tutorId);
  const availabilityIds = (availIds ?? []).map((a) => a.id);
  if (availabilityIds.length > 0) {
    const MS24 = 24 * 60 * 60 * 1000;
    const { data: reqRows } = await adminClient
      .from("session_requests")
      .select("status, created_at, updated_at")
      .in("availability_id", availabilityIds);
    const decided = (reqRows ?? []).filter((r) => r.status === "approved" || r.status === "rejected");
    const inTime = decided.filter(
      (r) => new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() <= MS24,
    );
    responseRatePercent =
      decided.length === 0 ? null : Math.round((inTime.length / decided.length) * 1000) / 10;
  }

  const breakthroughs = await getGuideBreakthroughs(tutorId, 5);
  const teachingPortfolio = await loadGuidePortfolioForPublic(tutorId);

  const { data: sessionStatusRows } = await adminClient
    .from("sessions")
    .select("status")
    .eq("tutor_id", tutorId)
    .in("status", ["completed", "cancelled"]);

  const completedCount = (sessionStatusRows ?? []).filter((r) => r.status === "completed").length;
  const cancelledCount = (sessionStatusRows ?? []).filter((r) => r.status === "cancelled").length;
  const showUpRatePercent =
    completedCount + cancelledCount === 0
      ? null
      : Math.round((completedCount / (completedCount + cancelledCount)) * 1000) / 10;

  return {
    id: tutorId,
    email,
    name: displayName,
    avatarUrl,
    sessionCount,
    avgRating,
    ratingCount: ratingList.length,
    ratingDistribution,
    reviews,
    courses: allSubjects,
    availability,
    autoApprove,
    tutorTimezone,
    bio,
    impactScores,
    impactNodeScores,
    guideRank: (tutorUser as { guide_rank?: string }).guide_rank ?? "practitioner",
    avgImpactScore,
    responseRatePercent,
    showUpRatePercent,
    breakthroughs,
    teachingPortfolio,
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
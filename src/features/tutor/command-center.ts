"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { getTutorCourses } from "@/features/tutor/courses";
import { normalizeTeachingDefaultDurationMinutes } from "@/features/tutor/teaching-defaults";
import type { PayoutDashboardData } from "@/features/payments/payout-ledger";
import { sanitizeForRsc } from "@/shared/core/rsc-serialize";
import {
  utcStartOfWeekMonday,
  logTutorLoader,
  loadTutorSection,
  STRIPE_PAYOUT_CAPTION,
  isMissingCancelledSessionColumnsError,
  enrichTutorRowsWithStudentProfiles,
  type TutorSessionStudentProfile,
} from "@/features/tutor/tutor-internal";
import { getTutorAvailability } from "@/features/tutor/availability";
import { getSessionRequests, getAutoApprove } from "@/features/tutor/session-requests";
import { getUpcomingSessions, getPastSessions } from "@/features/tutor/tutor-sessions";
import { getGuideImpactHistory } from "@/features/guide-rank/reads";
import {
  getGuideRankProgress,
  maxImpactScore,
} from "@/features/guide-rank/calculate-pure";
import type { GuideRankProgress } from "@/features/guide-rank/calculate-pure";
import type { GuideImpactEntry } from "@/features/guide-impact/impact-score-pure";

export type TutorCommandCenterEarningsDay = { date: string; cents: number };

export type TutorCommandCenterPayload = {
  tutorId: string;
  guideProfile: {
    displayName: string;
    avatarUrl: string | null;
  };
  metrics: {
    earningsThisMonthCents: number;
    stripePayoutCaption: string;
    sessionsThisWeek: number;
    avgRating: number | null;
    responseRatePercent: number | null;
    pendingRequestCount: number;
  };
  earningsLast30Days: TutorCommandCenterEarningsDay[];
  lateCancellationAlerts: { id: string; course: string; start_time: string }[];
  sessionRequests: Awaited<ReturnType<typeof import('@/features/tutor/session-requests').getSessionRequests>>;
  calendar: {
    weekRange: { startIso: string; endIso: string };
    availability: Array<{
      id: string;
      course: string;
      start_time: string;
      end_time: string;
      price_per_session?: number | null;
    }>;
    sessions: Array<{
      id: string;
      course: string;
      start_time: string;
      end_time: string;
      status: string;
      student_profile: TutorSessionStudentProfile;
    }>;
  };
  availability: Awaited<ReturnType<typeof import('@/features/tutor/availability').getTutorAvailability>>;
  upcomingSessions: Awaited<ReturnType<typeof import('@/features/tutor/tutor-sessions').getUpcomingSessions>>;
  pastSessions: Awaited<ReturnType<typeof import('@/features/tutor/tutor-sessions').getPastSessions>>;
  tutorCourses: Awaited<ReturnType<typeof import('@/features/tutor/courses').getTutorCourses>>;
  autoApprove: boolean;
  tutorTimezone: string;
  /** Teaching Defaults → session length for new openings (minutes). */
  sessionDefaultDurationMinutes: number;
  /** Stripe Connect & payout data (null if loading fails gracefully) */
  payoutData: PayoutDashboardData | null;
  guideRank: string;
  rankProgress: GuideRankProgress;
  impactScores: GuideImpactEntry[];
  impactHistoryLast30Days: { date: string; impactScore: number }[];
  completedSessionsTotal: number;
};

function fallbackTutorCommandCenterPayload(
  user: Awaited<ReturnType<typeof requireRole>>,
): TutorCommandCenterPayload {
  const now = new Date();
  const weekStart = utcStartOfWeekMonday(now);
  const calendarEnd = new Date(weekStart);
  calendarEnd.setUTCDate(weekStart.getUTCDate() + 14);
  return {
    tutorId: user.id,
    guideProfile: {
      displayName: user.displayName?.trim() || user.email?.split("@")[0] || "Guide",
      avatarUrl: user.avatarUrl ?? null,
    },
    metrics: {
      earningsThisMonthCents: 0,
      stripePayoutCaption: STRIPE_PAYOUT_CAPTION,
      sessionsThisWeek: 0,
      avgRating: null,
      responseRatePercent: null,
      pendingRequestCount: 0,
    },
    earningsLast30Days: [],
    lateCancellationAlerts: [],
    sessionRequests: [],
    calendar: {
      weekRange: { startIso: weekStart.toISOString(), endIso: calendarEnd.toISOString() },
      availability: [],
      sessions: [],
    },
    availability: [],
    upcomingSessions: [],
    pastSessions: [],
    tutorCourses: [],
    autoApprove: false,
    tutorTimezone: "UTC",
    sessionDefaultDurationMinutes: 60,
    payoutData: null,
    guideRank: "practitioner",
    rankProgress: getGuideRankProgress({
      rankKey: "practitioner",
      sessionsCompleted: 0,
      maxImpactScore: 0,
    }),
    impactScores: [],
    impactHistoryLast30Days: [],
    completedSessionsTotal: 0,
  };
}

export async function getTutorCommandCenterData(): Promise<TutorCommandCenterPayload> {
  const user = await requireRole(["tutor", "admin"]);
  const tutorId = user.id;

  try {
    logTutorLoader("start", { tutorId });
    const supabase = await createClient();

    const now = new Date();
    const weekStart = utcStartOfWeekMonday(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
    const calendarEnd = new Date(weekStart);
    calendarEnd.setUTCDate(weekStart.getUTCDate() + 14);

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEndExclusive = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const MS24 = 24 * 60 * 60 * 1000;

    const [
      sessionRequests,
      availability,
      upcomingSessions,
      pastSessions,
      tutorCourses,
      autoApprove,
      ratingsRes,
      monthSessionsRes,
      weekSessionsRes,
      chartSessionsRes,
      calAvailRes,
      calSessionsRes,
      availIdsRes,
      settingsTzRes,
      guideRankRes,
      impactScoresRes,
      completedCountRes,
    ] = await Promise.all([
      loadTutorSection("sessionRequests", () => getSessionRequests(), []),
      loadTutorSection("availability", () => getTutorAvailability(), []),
      loadTutorSection("upcomingSessions", () => getUpcomingSessions(), []),
      loadTutorSection("pastSessions", () => getPastSessions(), []),
      loadTutorSection("tutorCourses", () => getTutorCourses(), []),
      loadTutorSection("autoApprove", () => getAutoApprove(), false),
      supabase.from("ratings").select("rating").eq("tutor_id", tutorId),
      supabase
        .from("sessions")
        .select("price_per_session")
        .eq("tutor_id", tutorId)
        .eq("status", "completed")
        .gte("end_time", monthStart.toISOString())
        .lt("end_time", monthEndExclusive.toISOString()),
      supabase
        .from("sessions")
        .select("id")
        .eq("tutor_id", tutorId)
        .eq("status", "scheduled")
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", weekEnd.toISOString()),
      supabase
        .from("sessions")
        .select("end_time, price_per_session")
        .eq("tutor_id", tutorId)
        .eq("status", "completed")
        .gte("end_time", thirtyDaysAgo.toISOString()),
      supabase
        .from("availability")
        .select("id, course, start_time, end_time, price_per_session, active, booking_status")
        .eq("tutor_id", tutorId)
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", calendarEnd.toISOString()),
      supabase
        .from("sessions")
        .select("id, course, start_time, end_time, status, student_id")
        .eq("tutor_id", tutorId)
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", calendarEnd.toISOString()),
      supabase.from("availability").select("id").eq("tutor_id", tutorId),
      supabase
        .from("user_settings")
        .select("timezone, session_default_duration")
        .eq("user_id", tutorId)
        .maybeSingle(),
      supabase.from("users").select("guide_rank").eq("id", tutorId).maybeSingle(),
      supabase
        .from("guide_impact_scores")
        .select("subject, impact_score, sessions_counted")
        .eq("guide_id", tutorId)
        .order("impact_score", { ascending: false }),
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("tutor_id", tutorId)
        .eq("status", "completed")
        .eq("completed", true),
    ]);

    const supabaseErrors = [
      ratingsRes.error,
      monthSessionsRes.error,
      weekSessionsRes.error,
      chartSessionsRes.error,
      calAvailRes.error,
      calSessionsRes.error,
      availIdsRes.error,
      settingsTzRes.error,
    ].filter(Boolean);
    for (const e of supabaseErrors) {
      console.warn("[tutor] command center partial query failed:", e?.message ?? e);
    }
    logTutorLoader("parallel-queries-finished", {
      supabaseErrorCount: supabaseErrors.length,
      sessionRequests: Array.isArray(sessionRequests) ? sessionRequests.length : null,
      availability: Array.isArray(availability) ? availability.length : null,
      upcomingSessions: Array.isArray(upcomingSessions) ? upcomingSessions.length : null,
      pastSessions: Array.isArray(pastSessions) ? pastSessions.length : null,
      tutorCourses: Array.isArray(tutorCourses) ? tutorCourses.length : null,
    });

    const earningsThisMonthCents = (monthSessionsRes.data ?? []).reduce((sum, row) => {
      const c = row.price_per_session ?? 0;
      return sum + (typeof c === "number" ? c : 0);
    }, 0);

    const ratings = ratingsRes.data ?? [];
    const avgRating =
      ratings.length === 0
        ? null
        : Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10;

    const sessionsThisWeek = (weekSessionsRes.data ?? []).length;

    const byDay = new Map<string, number>();
    for (const row of chartSessionsRes.data ?? []) {
      const end = new Date(row.end_time);
      const key = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")}`;
      const cents = typeof row.price_per_session === "number" ? row.price_per_session : 0;
      byDay.set(key, (byDay.get(key) ?? 0) + cents);
    }

    const earningsLast30Days: TutorCommandCenterEarningsDay[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      earningsLast30Days.push({ date: key, cents: byDay.get(key) ?? 0 });
    }

    const availabilityIds = (availIdsRes.data ?? []).map((a) => a.id);
    let responseRatePercent: number | null = null;
    if (availabilityIds.length > 0) {
      const { data: reqRows, error: reqErr } = await supabase
        .from("session_requests")
        .select("status, created_at, updated_at")
        .in("availability_id", availabilityIds);
      if (reqErr) {
        console.warn("[tutor] response rate query failed:", reqErr.message);
      } else {
        const decided = (reqRows ?? []).filter((r) => r.status === "approved" || r.status === "rejected");
        const inTime = decided.filter(
          (r) => new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() <= MS24,
        );
        responseRatePercent =
          decided.length === 0 ? null : Math.round((inTime.length / decided.length) * 1000) / 10;
      }
    }
    logTutorLoader("response-rate-finished", {
      availabilityIds: availabilityIds.length,
      responseRatePercent,
    });

    let lateCancellationAlerts: Array<{ id: string; course: string; start_time: string }> = [];
    const { data: lateRows, error: lateErr } = await supabase
      .from("sessions")
      .select("id, course, start_time, cancelled_at, cancelled_by_role")
      .eq("tutor_id", tutorId)
      .eq("status", "cancelled")
      .eq("cancelled_by_role", "student")
      .not("cancelled_at", "is", null);

    if (lateErr) {
      if (!isMissingCancelledSessionColumnsError(lateErr)) {
        console.warn("[tutor] late cancellation query failed:", lateErr.message);
      }
    } else {
      lateCancellationAlerts = (lateRows ?? [])
        .filter((s) => {
          if (!s.cancelled_at) return false;
          const start = new Date(s.start_time).getTime();
          const ca = new Date(s.cancelled_at).getTime();
          const msLeft = start - ca;
          return msLeft > 0 && msLeft <= MS24;
        })
        .map((s) => ({ id: s.id, course: s.course, start_time: s.start_time }));
    }

    // Load payout dashboard data (non-critical — fail silently)
    let payoutData: PayoutDashboardData | null = null;
    try {
      const { getPayoutDashboardData } = await import("@/features/payments/payout-ledger");
      payoutData = await getPayoutDashboardData(tutorId);
    } catch (e) {
      console.warn("[tutor] payout data load failed (non-critical):", e);
    }
    const enrichedCalSessions = await enrichTutorRowsWithStudentProfiles(calSessionsRes.data ?? []);

    const impactScores: GuideImpactEntry[] = (impactScoresRes.data ?? []).map((row) => ({
      subject: row.subject,
      impactScore: Number(row.impact_score),
      sessionsCounted: row.sessions_counted,
    }));
    const completedSessionsTotal = completedCountRes.count ?? pastSessions.length;
    const guideRank = (guideRankRes.data?.guide_rank as string) ?? "practitioner";
    const rankProgress = getGuideRankProgress({
      rankKey: guideRank,
      sessionsCompleted: completedSessionsTotal,
      maxImpactScore: maxImpactScore(impactScores),
    });
    let impactHistoryLast30Days: { date: string; impactScore: number }[] = [];
    try {
      impactHistoryLast30Days = await getGuideImpactHistory(tutorId, 30);
    } catch {
      impactHistoryLast30Days = [];
    }

    let calendarAvailability = calAvailRes.data ?? [];
    const calAvailIds = calendarAvailability.map((a) => a.id);
    if (calAvailIds.length > 0) {
      const { data: calPendingRows } = await supabase
        .from("session_requests")
        .select("availability_id")
        .in("availability_id", calAvailIds)
        .eq("status", "pending");
      const pendingByAvail = new Map<string, number>();
      for (const p of calPendingRows ?? []) {
        const aid = p.availability_id as string;
        pendingByAvail.set(aid, (pendingByAvail.get(aid) ?? 0) + 1);
      }
      calendarAvailability = calendarAvailability.map((a) => ({
        ...a,
        pending_booking_count: pendingByAvail.get(a.id) ?? 0,
      }));
    }

    const payload: TutorCommandCenterPayload = {
      tutorId,
    guideProfile: {
        displayName: user.displayName?.trim() || user.email?.split("@")[0] || "Guide",
        avatarUrl: user.avatarUrl ?? null,
      },
      metrics: {
        earningsThisMonthCents,
        stripePayoutCaption: STRIPE_PAYOUT_CAPTION,
        sessionsThisWeek,
        avgRating,
        responseRatePercent,
        pendingRequestCount: sessionRequests.length,
      },
      earningsLast30Days,
      lateCancellationAlerts,
      sessionRequests,
      calendar: {
        weekRange: { startIso: weekStart.toISOString(), endIso: calendarEnd.toISOString() },
        availability: calendarAvailability,
        sessions: enrichedCalSessions,
      },
      availability,
      upcomingSessions,
      pastSessions,
      tutorCourses,
      autoApprove,
      tutorTimezone:
        typeof settingsTzRes.data?.timezone === "string" && settingsTzRes.data.timezone.length > 0
          ? settingsTzRes.data.timezone
          : "UTC",
      sessionDefaultDurationMinutes: normalizeTeachingDefaultDurationMinutes(
        settingsTzRes.data?.session_default_duration,
      ),
      payoutData,
      guideRank,
      rankProgress,
      impactScores,
      impactHistoryLast30Days,
      completedSessionsTotal,
    };

    logTutorLoader("payload-built", {
      earningsDays: payload.earningsLast30Days.length,
      lateCancellationAlerts: payload.lateCancellationAlerts.length,
      pendingRequests: payload.metrics.pendingRequestCount,
      tutorTimezone: payload.tutorTimezone,
    });
    return sanitizeForRsc(payload);
  } catch (e) {
    console.error("[tutor] command center failed — using fallback payload:", {
      tutorId,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return sanitizeForRsc(fallbackTutorCommandCenterPayload(user));
  }
}
"use server";

import { randomUUID } from "crypto";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createAvailabilitySlotsSchema, setAvailabilityActiveSchema } from "@/lib/availability-schemas";
import { buildSlotCandidates } from "@/lib/availability-slot-builder";
import {
  sendSessionApprovedEmail,
  type SessionEmailDetails,
} from "@/lib/email";
import { createRefundForRejectedRequest } from "@/lib/stripe-session-booking";
import { createPayoutLedgerForSession } from "@/app/actions/stripe-connect";
import type { Session } from "@/lib/database.types";
import {
  validateCourse,
  validateUUID,
  validateTimeSlot,
  validateFutureDate,
  sanitizeCourseName,
  sanitizeError,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/lib/security";
import type { PayoutDashboardData } from "@/app/actions/stripe-connect";
import { sanitizeForRsc } from "@/lib/rsc-serialize";

/** Monday 00:00:00 UTC for the week containing `d` (used for consistent server/client week bounds). */
function utcStartOfWeekMonday(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

const STRIPE_PAYOUT_CAPTION =
  "";

const TUTOR_LOADER_DEBUG = true;
function logTutorLoader(stage: string, details?: Record<string, unknown>): void {
  if (!TUTOR_LOADER_DEBUG) return;
  const payload = details ?? {};
  console.log(`[tutor-loader] ${stage}`, payload);
}

async function loadTutorSection<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[tutor] ${label} failed:`, e);
    return fallback;
  }
}

/** True when DB migration 024 (sessions.cancelled_*) is not applied yet. */
function isMissingCancelledSessionColumnsError(err: { message?: string }): boolean {
  const m = (err.message ?? "").toLowerCase();
  return (
    m.includes("does not exist") &&
    (m.includes("cancelled_at") || m.includes("cancelled_by_role"))
  );
}

function isMissingSessionHideColumnsError(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return m.includes("does not exist") && (m.includes("student_hidden_at") || m.includes("tutor_hidden_at"));
}

function isMissingAvailabilityColumnsError(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("does not exist") &&
    (m.includes("active") || m.includes("booking_status") || m.includes("max_students") || m.includes("series_id"))
  );
}

export type TutorSessionStudentProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

async function enrichTutorRowsWithStudentProfiles<T extends { student_id: string }>(
  rows: T[]
): Promise<Array<T & { student: { id: string }; student_email: string | null; student_profile: TutorSessionStudentProfile }>> {
  if (rows.length === 0) return [];

  const adminClient = createAdminClient();
  const studentIds = Array.from(new Set(rows.map((r) => r.student_id).filter(Boolean)));

  const { data: settingsRows } = await adminClient
    .from("user_settings")
    .select("user_id, display_name, avatar_url")
    .in("user_id", studentIds);

  const settingsById = new Map(
    (settingsRows ?? []).map((row) => [
      row.user_id,
      {
        display_name: typeof row.display_name === "string" ? row.display_name.trim() || null : null,
        avatar_url: typeof row.avatar_url === "string" && row.avatar_url.length > 0 ? row.avatar_url : null,
      },
    ])
  );

  const emailById = new Map<string, string>();
  const metaAvatarById = new Map<string, string | null>();

  await Promise.all(
    studentIds.map(async (sid) => {
      try {
        const { data: authData } = await adminClient.auth.admin.getUserById(sid);
        const email = authData?.user?.email ?? "";
        if (email) emailById.set(sid, email);

        const meta = authData?.user?.user_metadata as Record<string, unknown> | undefined;
        const avatarRaw = meta?.avatar_url ?? meta?.picture;
        metaAvatarById.set(
          sid,
          typeof avatarRaw === "string" && avatarRaw.length > 0 ? avatarRaw : null,
        );
      } catch {
        // best-effort
      }
    })
  );

  return rows.map((row) => {
    const email = emailById.get(row.student_id) ?? null;
    const settings = settingsById.get(row.student_id);
    const avatar = settings?.avatar_url ?? metaAvatarById.get(row.student_id) ?? null;

    return {
      ...row,
      student: { id: row.student_id },
      student_email: email,
      student_profile: {
        id: row.student_id,
        email,
        display_name: settings?.display_name ?? null,
        avatar_url: avatar,
      },
    };
  });
}

export type TutorCommandCenterEarningsDay = { date: string; cents: number };

export type TutorCommandCenterPayload = {
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
  sessionRequests: Awaited<ReturnType<typeof getSessionRequests>>;
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
    }>;
  };
  availability: Awaited<ReturnType<typeof getTutorAvailability>>;
  upcomingSessions: Awaited<ReturnType<typeof getUpcomingSessions>>;
  pastSessions: Awaited<ReturnType<typeof getPastSessions>>;
  tutorCourses: Awaited<ReturnType<typeof getTutorCourses>>;
  autoApprove: boolean;
  tutorTimezone: string;
  /** Stripe Connect & payout data (null if loading fails gracefully) */
  payoutData: PayoutDashboardData | null;
};

function fallbackTutorCommandCenterPayload(
  user: Awaited<ReturnType<typeof requireRole>>,
): TutorCommandCenterPayload {
  const now = new Date();
  const weekStart = utcStartOfWeekMonday(now);
  const calendarEnd = new Date(weekStart);
  calendarEnd.setUTCDate(weekStart.getUTCDate() + 14);
  return {
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
    payoutData: null,
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
        .select("id, course, start_time, end_time, price_per_session")
        .eq("tutor_id", tutorId)
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", calendarEnd.toISOString()),
      supabase
        .from("sessions")
        .select("id, course, start_time, end_time, status")
        .eq("tutor_id", tutorId)
        .eq("status", "scheduled")
        .gte("start_time", weekStart.toISOString())
        .lt("start_time", calendarEnd.toISOString()),
      supabase.from("availability").select("id").eq("tutor_id", tutorId),
      supabase.from("user_settings").select("timezone").eq("user_id", tutorId).maybeSingle(),
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
    const { getPayoutDashboardData } = await import("@/app/actions/stripe-connect");
    payoutData = await getPayoutDashboardData(tutorId);
  } catch (e) {
    console.warn("[tutor] payout data load failed (non-critical):", e);
  }
  logTutorLoader("payout-data-finished", {
    hasPayoutData: payoutData != null,
    payoutsEnabled: payoutData?.connectStatus?.payoutsEnabled ?? null,
  });

  const payload: TutorCommandCenterPayload = {
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
      availability: calAvailRes.data ?? [],
      sessions: calSessionsRes.data ?? [],
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
    payoutData,
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

export async function getTutorAvailability() {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  const runQuery = async (withAvailabilityFilters: boolean) => {
    let query = supabase
      .from("availability")
      .select("*")
      .eq("tutor_id", user.id)
      .gte("start_time", nowIso)
      .order("start_time", { ascending: true });

    if (withAvailabilityFilters) {
      query = query.eq("active", true).or("booking_status.eq.available,booking_status.is.null");
    }

    return query;
  };

  let { data, error } = await runQuery(true);

  if (error && isMissingAvailabilityColumnsError(error)) {
    const fallback = await runQuery(false);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(`Failed to fetch availability: ${error.message}`);
  }

  const rows = data || [];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: pendingRows, error: pendingErr } = await supabase
    .from("session_requests")
    .select("availability_id")
    .in("availability_id", ids)
    .eq("status", "pending");

  if (pendingErr) {
    throw new Error(`Failed to fetch booking counts: ${pendingErr.message}`);
  }

  const count = new Map<string, number>();
  for (const p of pendingRows ?? []) {
    const aid = p.availability_id as string;
    count.set(aid, (count.get(aid) ?? 0) + 1);
  }

  return rows.map((r) => ({
    ...r,
    pending_booking_count: count.get(r.id) ?? 0,
  }));
}

function windowsOverlap(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): boolean {
  return a0 < b1 && b0 < a1;
}

async function assertAvailabilityWindowAllowed(
  adminClient: ReturnType<typeof createAdminClient>,
  actingAsId: string,
  course: string,
  start: Date,
  end: Date,
): Promise<void> {
  const { data: existing, error: checkError } = await adminClient
    .from("availability")
    .select("id")
    .eq("tutor_id", actingAsId)
    .eq("course", course)
    .eq("start_time", start.toISOString())
    .maybeSingle();

  if (checkError) {
    throw new Error(`Failed to check existing availability: ${checkError.message}`);
  }

  if (existing) {
    throw new Error("Availability slot already exists");
  }

  const { data: allAvailability, error: fetchError } = await adminClient
    .from("availability")
    .select("start_time, end_time")
    .eq("tutor_id", actingAsId)
    .eq("course", course);

  if (fetchError) {
    throw new Error(`Failed to check overlapping availability: ${fetchError.message}`);
  }

  const ws = start.getTime();
  const we = end.getTime();
  const hasOverlap = (allAvailability || []).some((avail) => {
    const availStart = new Date(avail.start_time).getTime();
    const availEnd = new Date(avail.end_time).getTime();
    return windowsOverlap(ws, we, availStart, availEnd);
  });

  if (hasOverlap) {
    throw new Error("Overlapping availability slots are not allowed");
  }

  const nowIso = new Date().toISOString();
  const { data: upcomingSessions, error: sessionCheckError } = await adminClient
    .from("sessions")
    .select("start_time, end_time")
    .eq("tutor_id", actingAsId)
    .eq("status", "scheduled")
    .gte("end_time", nowIso);

  if (sessionCheckError) {
    throw new Error(`Failed to check existing sessions: ${sessionCheckError.message}`);
  }

  const hasSessionConflict = (upcomingSessions ?? []).some((s) => {
    const s0 = new Date(s.start_time).getTime();
    const s1 = new Date(s.end_time).getTime();
    return windowsOverlap(ws, we, s0, s1);
  });

  if (hasSessionConflict) {
    throw new Error("Tutor already has a session at this time");
  }
}

export async function createAvailabilitySlots(
  raw: Record<string, unknown>,
  onBehalfOfUserId?: string,
) {
  try {
    const user = await requireRole(["tutor", "admin"]);

    if (user.role === "admin" && !onBehalfOfUserId) {
      throw new Error(
        "Invalid admin context: open a tutor from the HR panel first, then add slots.",
      );
    }

    const actingAsId =
      user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;

    const adminClient = createAdminClient();

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.createAvailability,
      "create availability",
    );

    const parsed = createAvailabilitySlotsSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      throw new Error(msg || "Invalid availability payload");
    }
    const input = parsed.data;

    const validCourse = sanitizeCourseName(validateCourse(input.course));

    const { data: courseProof, error: courseErr } = await adminClient
      .from("tutor_courses")
      .select("id")
      .eq("tutor_id", actingAsId)
      .eq("course_name", validCourse)
      .maybeSingle();

    if (courseErr) {
      throw new Error(`Failed to verify course: ${courseErr.message}`);
    }
    if (!courseProof) {
      throw new Error("Add this subject under My expertise before creating open slots.");
    }

    const recurringWeeks = input.recurring ? (input.recurringWeeks ?? 12) : 1;
    const weeks = Math.min(52, Math.max(1, recurringWeeks));

    const candidates = buildSlotCandidates(
      new Date(),
      input.timezone,
      input.weekdays,
      input.startTime,
      input.endTime,
      weeks,
    );

    if (candidates.length === 0) {
      throw new Error("No future slots matched your selections. Try different days or times.");
    }

    const pricePerSession = Math.max(1, Math.round(input.priceUsd * 100));
    const seriesId = randomUUID();

    const rows: Array<{
      tutor_id: string;
      course: string;
      start_time: string;
      end_time: string;
      price_per_session: number;
      active: boolean;
      max_students: number;
      series_id: string;
      booking_status: "available";
      locked_until: null;
      locked_by: null;
    }> = [];

    const legacyRows: Array<{
      tutor_id: string;
      course: string;
      start_time: string;
      end_time: string;
      price_per_session: number;
    }> = [];

    for (const c of candidates) {
      await assertAvailabilityWindowAllowed(adminClient, actingAsId, validCourse, c.startUtc, c.endUtc);
      rows.push({
        tutor_id: actingAsId,
        course: validCourse,
        start_time: c.startUtc.toISOString(),
        end_time: c.endUtc.toISOString(),
        price_per_session: pricePerSession,
        active: true,
        max_students: input.maxStudents,
        series_id: seriesId,
        booking_status: "available",
        locked_until: null,
        locked_by: null,
      });
      legacyRows.push({
        tutor_id: actingAsId,
        course: validCourse,
        start_time: c.startUtc.toISOString(),
        end_time: c.endUtc.toISOString(),
        price_per_session: pricePerSession,
      });
    }

    const { error: insertError } = await adminClient.from("availability").insert(rows);

    if (insertError) {
      if (isMissingAvailabilityColumnsError(insertError) || insertError.message?.includes("schema cache")) {
        const { error: legacyInsertError } = await adminClient.from("availability").insert(legacyRows);
        if (legacyInsertError) {
          throw new Error(`Failed to create availability: ${legacyInsertError.message}`);
        }
      } else {
        throw new Error(`Failed to create availability: ${insertError.message}`);
      }
    }

    revalidatePath("/tutor");
    return { success: true, created: rows.length };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export async function setAvailabilityActive(
  raw: Record<string, unknown>,
  onBehalfOfUserId?: string,
) {
  try {
    const user = await requireRole(["tutor", "admin"]);

    if (user.role === "admin" && !onBehalfOfUserId) {
      throw new Error(
        "Invalid admin context: open a tutor from the HR panel first, then manage slots.",
      );
    }

    const actingAsId =
      user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;

    const parsed = setAvailabilityActiveSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      throw new Error(msg || "Invalid input");
    }
    const { availabilityId, active } = parsed.data;

    const client =
      user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

    const { data: row, error: fetchErr } = await client
      .from("availability")
      .select("tutor_id")
      .eq("id", availabilityId)
      .single();

    if (fetchErr || !row) {
      throw new Error("Availability not found");
    }
    if (row.tutor_id !== actingAsId && user.role !== "admin") {
      throw new Error("You don't have permission to update this slot");
    }

    const { error: updateErr } = await client
      .from("availability")
      .update({ active })
      .eq("id", availabilityId)
      .eq("tutor_id", actingAsId);

    if (updateErr) {
      if (isMissingAvailabilityColumnsError(updateErr) || updateErr.message?.includes("schema cache")) {
        revalidatePath("/tutor");
        return { success: true };
      }
      throw new Error(`Failed to update slot: ${updateErr.message}`);
    }

    revalidatePath("/tutor");
    return { success: true };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export async function createAvailability(
  course: string,
  startTime: string,
  priceDollars?: number,
  onBehalfOfUserId?: string,
  durationMinutes?: number,
) {
  try {
    const user = await requireRole(["tutor", "admin"]);

    if (user.role === "admin" && !onBehalfOfUserId) {
      throw new Error(
        "Invalid admin context: open a tutor from the HR panel first, then add slots.",
      );
    }

    const actingAsId =
      user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;

    // Service role avoids RLS/JWT claim mismatches (approved/role in JWT vs users row).
    const adminClient = createAdminClient();

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.createAvailability,
      "create availability",
    );

    const validCourse = sanitizeCourseName(validateCourse(course));
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      throw new Error("Invalid date/time");
    }
    validateFutureDate(start);
    validateTimeSlot(start);

    const rawDuration =
      typeof durationMinutes === "number" && Number.isFinite(durationMinutes)
        ? Math.round(durationMinutes)
        : 30;
    const duration = Math.min(480, Math.max(15, rawDuration));
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const pricePerSession =
      typeof priceDollars === "number" && Number.isFinite(priceDollars)
        ? Math.max(1, Math.round(priceDollars * 100))
        : 2500;

    await assertAvailabilityWindowAllowed(adminClient, actingAsId, validCourse, start, end);

    let { data, error } = await adminClient
      .from("availability")
      .insert({
        tutor_id: actingAsId,
        course: validCourse,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        price_per_session: pricePerSession,
        active: true,
        max_students: 1,
      })
      .select()
      .single();

    if (error && (isMissingAvailabilityColumnsError(error) || error.message?.includes("schema cache"))) {
      ({ data, error } = await adminClient
        .from("availability")
        .insert({
          tutor_id: actingAsId,
          course: validCourse,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          price_per_session: pricePerSession,
        })
        .select()
        .single());
    }

    if (error) {
      const detail =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : String(error);
      throw new Error(`Failed to create availability: ${detail}`);
    }

    revalidatePath("/tutor");
    return { success: true, availability: data };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export async function deleteAvailability(availabilityId: string, onBehalfOfUserId?: string) {
  try {
    const user = await requireRole(["tutor", "admin"]);

    const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
    const client = user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

    const validAvailabilityId = validateUUID(availabilityId);

    const { data: availability, error: checkError } = await client
      .from("availability")
      .select("tutor_id")
      .eq("id", validAvailabilityId)
      .single();

    if (checkError || !availability) {
      throw new Error("Availability not found");
    }

    if (availability.tutor_id !== actingAsId && user.role !== "admin") {
      throw new Error("You don't have permission to delete this availability");
    }

    const { count: pendingCount, error: pendingErr } = await client
      .from("session_requests")
      .select("*", { count: "exact", head: true })
      .eq("availability_id", validAvailabilityId)
      .eq("status", "pending");

    if (pendingErr) {
      throw new Error(`Failed to check pending bookings: ${pendingErr.message}`);
    }
    if (pendingCount && pendingCount > 0) {
      throw new Error(
        "This slot has pending learner requests. Decline them in Command center before deleting.",
      );
    }

    const { error } = await client
      .from("availability")
      .delete()
      .eq("id", validAvailabilityId);

    if (error) {
      throw new Error(`Failed to delete availability: ${sanitizeError(error)}`);
    }

    revalidatePath("/tutor");
    return { success: true };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

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

export async function getPastSessions() {
  const user = await requireRole(["tutor", "admin"]);
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
        .eq("tutor_id", user.id)
        .is("tutor_hidden_at", null)
        .lt("end_time", nowIso),
      supabase
        .from("sessions")
        .select("*")
        .eq("tutor_id", user.id)
        .is("tutor_hidden_at", null)
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
      supabase.from("sessions").select("*").eq("tutor_id", user.id).lt("end_time", nowIso),
      supabase
        .from("sessions")
        .select("*")
        .eq("tutor_id", user.id)
        .in("status", ["completed", "cancelled"])
        .gte("end_time", nowIso),
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
  const sessions = Array.from(byId.values()).sort(
    (a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime(),
  );
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

export async function getSessionRequests() {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const { data: availability, error: availError } = await supabase
    .from("availability")
    .select("id")
    .eq("tutor_id", user.id);

  if (availError) {
    throw new Error(`Failed to fetch availability: ${availError.message}`);
  }

  const availabilityIds = (availability || []).map((a) => a.id);

  if (availabilityIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("session_requests")
    .select(`*, availability:availability(*)`)
    .in("availability_id", availabilityIds)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch session requests: ${error.message}`);
  }

  const requests = data || [];
  if (requests.length === 0) return [];

  const adminClient = createAdminClient();
  const studentIds = Array.from(new Set(requests.map((r) => r.student_id)));
  const enrichedRequests = await enrichTutorRowsWithStudentProfiles(requests);

  // Enrich with institution badge (non-critical, best-effort)
  const institutionBadgeMap: Record<string, { institutionName: string; logoUrl: string | null } | null> = {};
  await Promise.all(
    studentIds.map(async (sid) => {
      try {
        const { data: membership } = await adminClient
          .from("institution_members")
          .select("institution_id, institutions(name, logo_url)")
          .eq("user_id", sid)
          .maybeSingle();
        if (membership) {
          const inst = (membership as unknown as { institutions: { name: string; logo_url: string | null } | null }).institutions;
          institutionBadgeMap[sid] = inst ? { institutionName: inst.name, logoUrl: inst.logo_url } : null;
        } else {
          institutionBadgeMap[sid] = null;
        }
      } catch {
        institutionBadgeMap[sid] = null;
      }
    })
  );

  return enrichedRequests.map((r) => ({
    ...r,
    institution: institutionBadgeMap[r.student_id] ?? null,
  }));
}

export async function approveSessionRequest(requestId: string, onBehalfOfUserId?: string) {
  const user = await requireRole(["tutor", "admin"]);
  let validRequestId: string;
  try {
    validRequestId = validateUUID(requestId);
  } catch {
    throw new Error("Invalid request ID");
  }

  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const adminClient = createAdminClient();

  const { data: rpcRow, error: rpcError } = await adminClient
    .rpc("approve_session_request_atomic", {
      p_request_id: validRequestId,
      p_actor_id: actingAsId,
    })
    .single();

  if (rpcError || !rpcRow) {
    const code = (rpcError?.message ?? "").toLowerCase();
    if (code.includes("request_not_found")) {
      throw new Error("Session request not found");
    }
    if (code.includes("request_not_pending")) {
      throw new Error("Request is not pending");
    }
    if (code.includes("request_forbidden")) {
      throw new Error("You don't have permission to approve this request");
    }
    if (code.includes("availability_not_found")) {
      throw new Error("Availability not found");
    }
    if (code.includes("tutor_double_booked")) {
      throw new Error("Tutor already has a session at this time");
    }
    if (code.includes("student_double_booked")) {
      throw new Error("Student already has a session at this time");
    }
    if (code.includes("session_conflict")) {
      throw new Error("This request was already processed by another action");
    }
    throw new Error(`Failed to approve request: ${rpcError?.message ?? "Unknown error"}`);
  }

  const sessionId = (rpcRow as { session_id?: string | null }).session_id ?? null;
  if (!sessionId) {
    throw new Error("Failed to approve request: missing session id");
  }

  const { data: session, error: sessionError } = await adminClient
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Approved session was created but could not be loaded");
  }

  // Create payout ledger at approval so transfer can release when session start time is reached.
  void createPayoutLedgerForSession(sessionId).catch((err) => {
    console.error("[approveSessionRequest] ledger creation failed:", err);
  });

  // Fire-and-forget email to student
  try {
    const [studentAuthData, settingsResult] = await Promise.all([
      adminClient.auth.admin.getUserById(session.student_id),
      adminClient
        .from("user_settings")
        .select("user_id, display_name")
        .in("user_id", [session.student_id, session.tutor_id]),
    ]);
    const studentEmail = studentAuthData.data?.user?.email;
    const nameByUser = Object.fromEntries(
      (settingsResult.data ?? []).map((r) => [r.user_id, r.display_name as string | null])
    );
    if (studentEmail && session) {
      const sessionDetails: SessionEmailDetails = {
        sessionId: session.id,
        course: session.course,
        startTime: session.start_time,
        endTime: session.end_time,
        studentDisplayName: nameByUser[session.student_id] ?? null,
        tutorDisplayName: nameByUser[session.tutor_id] ?? null,
        priceCents: session.price_per_session ?? null,
      };
      void sendSessionApprovedEmail(studentEmail, sessionDetails);
    }
  } catch (emailErr) {
    console.error("[approveSessionRequest] email notification failed:", emailErr);
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  return { success: true, session };
}

export async function rejectSessionRequest(requestId: string, onBehalfOfUserId?: string) {
  const user = await requireRole(["tutor", "admin"]);
  let validRequestId: string;
  try {
    validRequestId = validateUUID(requestId);
  } catch {
    throw new Error("Invalid request ID");
  }

  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client = user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

  const { data: request, error: requestError } = await client
    .from("session_requests")
    .select("tutor_id, status, stripe_payment_intent_id, stripe_refund_id")
    .eq("id", validRequestId)
    .single();

  if (requestError || !request) {
    throw new Error("Session request not found");
  }

  if (request.tutor_id !== actingAsId && user.role !== "admin") {
    throw new Error("You don't have permission to reject this request");
  }

  if (request.status !== "pending") {
    throw new Error("Request is not pending");
  }

  let refundId: string | null = (request as { stripe_refund_id?: string | null }).stripe_refund_id ?? null;
  const paymentIntentId = (request as { stripe_payment_intent_id?: string | null })
    .stripe_payment_intent_id;

  if (paymentIntentId && !refundId) {
    try {
      const refund = await createRefundForRejectedRequest(paymentIntentId, validRequestId);
      refundId = refund.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Refund failed";
      console.error("[rejectSessionRequest] Stripe refund failed:", err);
      throw new Error(
        `Could not issue refund: ${msg}. Try again or contact support so the student is not charged for a rejected session.`
      );
    }
  }

  const { error } = await client
    .from("session_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
      ...(refundId ? { stripe_refund_id: refundId } : {}),
    })
    .eq("id", validRequestId);

  if (error) {
    throw new Error(`Failed to reject request: ${error.message}`);
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  return { success: true, refunded: Boolean(paymentIntentId && refundId) };
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

export async function getAutoApprove() {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("auto_approve")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch auto-approve setting: ${error.message}`);
  }

  return data?.auto_approve || false;
}

export async function toggleAutoApprove(enabled: boolean, onBehalfOfUserId?: string) {
  const user = await requireRole(["tutor", "admin"]);

  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client = user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

  const { error } = await client
    .from("users")
    .update({ auto_approve: enabled })
    .eq("id", actingAsId);

  if (error) {
    throw new Error(`Failed to update auto-approve setting: ${error.message}`);
  }

  revalidatePath("/tutor");
  return { success: true };
}

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
  };
}

export async function getTutorPublicProfile(tutorId: string) {
  return fetchTutorPublicProfileUncached(tutorId);
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
      adminClient.from("user_settings").select("timezone").eq("user_id", tutorId).maybeSingle(),
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
  };
}

// ============================================================
// TUTOR COURSE EXPERTISE
// ============================================================

function isMissingTutorCoursesRelation(error: { message?: string; code?: string }): boolean {
  const m = (error.message ?? "").toLowerCase();
  const c = error.code ?? "";
  return (
    c === "42P01" ||
    c === "PGRST205" ||
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table")
  );
}

export async function getTutorCourses(onBehalfOfUserId?: string) {
  const user = await requireRole(["tutor", "admin"]);
  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  // Service role for admins: JWT role claims must not block reads on tutor_courses
  const client = user.role === "admin" ? createAdminClient() : await createClient();

  const { data, error } = await client
    .from("tutor_courses")
    .select("*")
    .eq("tutor_id", actingAsId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTutorCoursesRelation(error)) return [];
    const msg = typeof error === "object" && error && "message" in error ? String((error as { message: string }).message) : sanitizeError(error);
    throw new Error(`Failed to fetch tutor courses: ${msg}`);
  }
  return data ?? [];
}

export async function addTutorCourse(
  courseName: string,
  proofDescription: string,
  onBehalfOfUserId?: string,
) {
  const user = await requireRole(["tutor", "admin"]);
  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client = user.role === "admin" ? createAdminClient() : await createClient();

  const validName = sanitizeCourseName(validateCourse(courseName));
  const validProof = proofDescription.trim().slice(0, 500);

  if (!validProof) throw new Error("Please describe your qualifications for this course");

  const { error } = await client
    .from("tutor_courses")
    .insert({ tutor_id: actingAsId, course_name: validName, proof_description: validProof });

  if (error) {
    if (error.code === "23505") throw new Error("You already added this course");
    throw new Error(`Failed to add course: ${sanitizeError(error)}`);
  }

  revalidatePath("/tutor");
  return { success: true };
}

export async function removeTutorCourse(courseId: string, onBehalfOfUserId?: string) {
  const user = await requireRole(["tutor", "admin"]);
  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client = user.role === "admin" ? createAdminClient() : await createClient();

  const validId = validateUUID(courseId);

  const { error } = await client
    .from("tutor_courses")
    .delete()
    .eq("id", validId)
    .eq("tutor_id", actingAsId);

  if (error) throw new Error(`Failed to remove course: ${sanitizeError(error)}`);

  revalidatePath("/tutor");
  return { success: true };
}

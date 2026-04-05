"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  validateUUID,
  validateRating,
  validateComment,
  validateCourse,
  sanitizeCourseName,
  sanitizeError,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
} from "@/lib/security";
import { trackEvent } from "@/lib/analytics";
import { getDivisionKeyForCourse } from "@/app/actions/quest";
import { applyXpAward } from "@/app/actions/xp";
import { XP } from "@/lib/xp-constants";
import {
  sendSessionBookedEmail,
  type SessionEmailDetails,
} from "@/lib/email";
import { getVerifiedPaymentIntentForBooking } from "@/lib/stripe-session-booking";
import { addDaysIso } from "@/lib/booking-pricing";
import type { SessionAiPackage } from "@/lib/database.types";

function isMissingCancelledSessionColumnsError(err: { message?: string }): boolean {
  const m = (err.message ?? "").toLowerCase();
  return (
    m.includes("does not exist") &&
    (m.includes("cancelled_at") || m.includes("cancelled_by_role"))
  );
}

/** Tutor display info for learner session lists (from user_settings + auth metadata). */
export type StudentSessionTutorProfile = {
  id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string;
};

async function enrichStudentSessionsWithTutorProfiles<T extends { tutor_id: string }>(
  sessions: T[]
): Promise<Array<T & { tutor: StudentSessionTutorProfile }>> {
  if (sessions.length === 0) return [];

  const adminClient = createAdminClient();
  const tutorIds = Array.from(new Set(sessions.map((s) => s.tutor_id).filter(Boolean)));

  const { data: settingsRows } = await adminClient
    .from("user_settings")
    .select("user_id, display_name")
    .in("user_id", tutorIds);

  const nameById = new Map(
    (settingsRows ?? []).map((r) => [r.user_id, r.display_name as string | null])
  );

  const metaById = new Map<
    string,
    { display_name: string | null; avatar_url: string | null; email: string }
  >();

  await Promise.all(
    tutorIds.map(async (id) => {
      try {
        const { data } = await adminClient.auth.admin.getUserById(id);
        const u = data?.user;
        const email = u?.email ?? "";
        const meta = u?.user_metadata as Record<string, unknown> | undefined;
        const avatarRaw = meta?.avatar_url ?? meta?.picture;
        const avatar_url =
          typeof avatarRaw === "string" && avatarRaw.length > 0 ? avatarRaw : null;
        metaById.set(id, {
          display_name: nameById.get(id) ?? null,
          avatar_url,
          email,
        });
      } catch {
        metaById.set(id, {
          display_name: nameById.get(id) ?? null,
          avatar_url: null,
          email: "",
        });
      }
    })
  );

  return sessions.map((session) => {
    const m = metaById.get(session.tutor_id);
    return {
      ...session,
      tutor: {
        id: session.tutor_id,
        role: "tutor",
        display_name: m?.display_name ?? null,
        avatar_url: m?.avatar_url ?? null,
        email: m?.email,
      },
    };
  });
}

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

  const [{ data: endedRows, error: endedErr }, { data: closedEarlyRows, error: earlyErr }] =
    await Promise.all([
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
  const { data: pkgRows } = await adminClient
    .from("session_ai_packages")
    .select("*")
    .in("session_id", sessionIds)
    .not("package_published_at", "is", null);

  const pkgBySession = new Map(
    (pkgRows ?? []).map((p) => [p.session_id, p as SessionAiPackage])
  );

  return withTutors.map((session) => ({
    ...session,
    ratings: (ratings || []).filter((r) => r.session_id === session.id),
    ai_package: pkgBySession.get(session.id) ?? null,
  }));
}

/**
 * Single sessions fetch for the learner hub (replaces separate upcoming + past queries).
 * Falls back to getUpcomingSessions + getPastSessions if the merged filter is rejected.
 */
export async function getStudentSessionsHubBundle(): Promise<{
  upcomingSessions: Awaited<ReturnType<typeof getUpcomingSessions>>;
  pastSessions: Awaited<ReturnType<typeof getPastSessions>>;
}> {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const orFilter = `end_time.lt.${nowIso},and(status.in.(completed,cancelled),end_time.gte.${nowIso}),and(status.eq.scheduled,end_time.gte.${nowIso})`;

  const { data: mergedRows, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", user.id)
    .or(orFilter);

  if (error) {
    const [upcomingSessions, pastSessions] = await Promise.all([
      getUpcomingSessions(),
      getPastSessions(),
    ]);
    return { upcomingSessions, pastSessions };
  }

  const allRows = mergedRows ?? [];

  const upcomingRaw = allRows
    .filter((s) => s.status === "scheduled" && new Date(s.end_time) >= new Date(nowIso))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const upcomingIds = new Set(upcomingRaw.map((s) => s.id));
  const pastRaw = allRows.filter((s) => !upcomingIds.has(s.id));
  const pastSorted = pastRaw.sort(
    (a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime(),
  );

  const upcomingSessions = await enrichStudentSessionsWithTutorProfiles(upcomingRaw);

  if (pastSorted.length === 0) {
    return { upcomingSessions, pastSessions: [] };
  }

  const sessionIds = pastSorted.map((s) => s.id);
  const [{ data: ratings }, withTutors] = await Promise.all([
    supabase
      .from("ratings")
      .select("*")
      .in("session_id", sessionIds)
      .eq("student_id", user.id),
    enrichStudentSessionsWithTutorProfiles(pastSorted),
  ]);

  const adminClient = createAdminClient();
  const { data: pkgRows } = await adminClient
    .from("session_ai_packages")
    .select("*")
    .in("session_id", sessionIds)
    .not("package_published_at", "is", null);

  const pkgBySession = new Map(
    (pkgRows ?? []).map((p) => [p.session_id, p as SessionAiPackage])
  );

  const pastSessions = withTutors.map((session) => ({
    ...session,
    ratings: (ratings || []).filter((r) => r.session_id === session.id),
    ai_package: pkgBySession.get(session.id) ?? null,
  }));

  return { upcomingSessions, pastSessions };
}

export type StudentHubSnapshot = {
  user_xp: Record<string, unknown> | null;
  user_settings: {
    display_name?: string | null;
    timezone?: string | null;
    focused_division_key?: string | null;
  } | null;
  student_courses: Array<Record<string, unknown>>;
  has_pending_requests: boolean;
  tutor_expertise: Record<
    string,
    Array<{ course_name: string; proof_description: string; verified: boolean }>
  >;
  available_courses: string[];
  in_progress_quest: {
    quest_id: string;
    prompt: string;
    num_attempts: number | null;
  } | null;
};

/** One RPC round-trip: profile, courses, expertise map, availability courses, quest card, pending flag. */
export async function getStudentHubSnapshot(): Promise<StudentHubSnapshot> {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("student_hub_snapshot", {
    p_user_id: user.id,
  });

  if (error) {
    throw new Error(`Failed to load hub snapshot: ${error.message}`);
  }

  const raw = data as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") {
    return {
      user_xp: null,
      user_settings: null,
      student_courses: [],
      has_pending_requests: false,
      tutor_expertise: {},
      available_courses: [],
      in_progress_quest: null,
    };
  }

  const tutorExpertise: StudentHubSnapshot["tutor_expertise"] = {};
  const te = raw["tutor_expertise"];
  if (te && typeof te === "object" && !Array.isArray(te)) {
    for (const [tid, rows] of Object.entries(te as Record<string, unknown>)) {
      if (!Array.isArray(rows)) continue;
      tutorExpertise[tid] = rows
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const o = row as Record<string, unknown>;
          return {
            course_name: String(o.course_name ?? ""),
            proof_description: String(o.proof_description ?? ""),
            verified: Boolean(o.verified),
          };
        })
        .filter(Boolean) as StudentHubSnapshot["tutor_expertise"][string];
    }
  }

  let availableCourses: string[] = [];
  const ac = raw["available_courses"];
  if (Array.isArray(ac)) {
    availableCourses = ac.map((c) => String(c)).filter(Boolean);
  }

  let inProgress: StudentHubSnapshot["in_progress_quest"] = null;
  const ip = raw["in_progress_quest"];
  if (ip && typeof ip === "object" && !Array.isArray(ip)) {
    const o = ip as Record<string, unknown>;
    const qid = o.quest_id;
    if (typeof qid === "string" && qid) {
      inProgress = {
        quest_id: qid,
        prompt: typeof o.prompt === "string" ? o.prompt : "",
        num_attempts: typeof o.num_attempts === "number" ? o.num_attempts : null,
      };
    }
  }

  const us = raw["user_settings"];
  const userSettings =
    us && typeof us === "object" && !Array.isArray(us)
      ? (us as StudentHubSnapshot["user_settings"])
      : null;

  const sc = raw["student_courses"];
  const studentCourses = Array.isArray(sc) ? (sc as Array<Record<string, unknown>>) : [];

  return {
    user_xp: raw["user_xp"] && typeof raw["user_xp"] === "object" ? (raw["user_xp"] as Record<string, unknown>) : null,
    user_settings: userSettings,
    student_courses: studentCourses,
    has_pending_requests: Boolean(raw["has_pending_requests"]),
    tutor_expertise: tutorExpertise,
    available_courses: availableCourses,
    in_progress_quest: inProgress,
  };
}

export async function getHasPendingSessionRequests(): Promise<boolean> {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_requests")
    .select("id")
    .eq("student_id", user.id)
    .eq("status", "pending")
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

export async function cancelSession(sessionId: string, onBehalfOfUserId?: string) {
  const user = await requireRole(["student", "admin"]);

  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client = user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

  const { data: session, error: sessionError } = await client
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("student_id", actingAsId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found or you don't have permission");
  }

  const sessionStart = new Date(session.start_time);
  const now = new Date();
  const minutesUntilStart = (sessionStart.getTime() - now.getTime()) / (1000 * 60);

  if (minutesUntilStart <= 24 * 60) {
    throw new Error("Cannot cancel session less than 24 hours before start time");
  }

  const cancelledAt = new Date().toISOString();
  let { error: updateError } = await client
    .from("sessions")
    .update({
      status: "cancelled",
      cancelled_at: cancelledAt,
      cancelled_by_role: "student",
    })
    .eq("id", sessionId)
    .eq("student_id", actingAsId);

  if (updateError && isMissingCancelledSessionColumnsError(updateError)) {
    ({ error: updateError } = await client
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("id", sessionId)
      .eq("student_id", actingAsId));
  }

  if (updateError) {
    throw new Error(`Failed to cancel session: ${updateError.message}`);
  }

  revalidatePath("/student");
  return { success: true };
}

export async function getTutorAvailability(course?: string) {
  await requireRole(["student", "admin"]);

  const supabase = await createClient();
  const adminClient = createAdminClient();

  const windowEnd = addDaysIso(new Date(), 14);
  let query = supabase
    .from("availability")
    .select("*")
    .eq("active", true)
    .or("booking_status.eq.available,booking_status.is.null")
    .gte("start_time", new Date().toISOString())
    .lte("start_time", windowEnd)
    .order("start_time", { ascending: true });

  if (course) {
    query = query.eq("course", course);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch availability: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const tutorIds = Array.from(new Set(data.map((a) => a.tutor_id)));

  if (tutorIds.length === 0) {
    return [];
  }

  // Fetch only the relevant tutors (not all users)
  const { data: tutors } = await adminClient
    .from("users")
    .select("id, role, approved")
    .in("id", tutorIds)
    .eq("approved", true);

  const approvedTutorIds = new Set(tutors?.map((t) => t.id) || []);

  const { data: tutorSettings } = await adminClient
    .from("user_settings")
    .select("user_id, display_name, avatar_url")
    .in("user_id", tutorIds);

  const settingsByTutorId = new Map(
    (tutorSettings ?? []).map((row) => [
      row.user_id,
      {
        display_name: typeof row.display_name === "string" ? row.display_name.trim() || null : null,
        avatar_url: typeof row.avatar_url === "string" && row.avatar_url.length > 0 ? row.avatar_url : null,
      },
    ])
  );

  // Fetch tutor emails in parallel batches using optimized batching
  const tutorEmails = new Map<string, string>();
  const tutorMetaAvatar = new Map<string, string | null>();

  if (approvedTutorIds.size > 0) {
    const tutorIdArray = Array.from(approvedTutorIds);
    const { batchQueries } = await import("@/lib/performance");
    
    const emailQueries = tutorIdArray.map((tutorId) => async () => {
      try {
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(tutorId);
        if (!userError && userData?.user?.email) {
          const meta = userData.user.user_metadata as Record<string, unknown> | undefined;
          const avatarRaw = meta?.avatar_url ?? meta?.picture;
          const avatar = typeof avatarRaw === "string" && avatarRaw.length > 0 ? avatarRaw : null;
          return [tutorId, userData.user.email, avatar] as [string, string, string | null];
        }
      } catch (err) {
        console.error(`Error fetching email for tutor ${tutorId}:`, err);
      }
      return null;
    });

    const results = await batchQueries(emailQueries, 10);
    results.forEach((result) => {
      if (result) {
        tutorEmails.set(result[0], result[1]);
        tutorMetaAvatar.set(result[0], result[2] ?? null);
      }
    });
  }

  const result = data
    .filter((avail) => approvedTutorIds.has(avail.tutor_id))
    .map((avail) => {
      const tutor = tutors?.find((t) => t.id === avail.tutor_id);
      const email = tutorEmails.get(avail.tutor_id) || "";
      const settings = settingsByTutorId.get(avail.tutor_id);
      const avatar_url = settings?.avatar_url ?? tutorMetaAvatar.get(avail.tutor_id) ?? null;
      const display_name = settings?.display_name ?? (email ? email.split("@")[0] : null);

      return {
        ...avail,
        tutor: tutor
          ? {
              id: tutor.id,
              role: tutor.role,
              approved: tutor.approved,
              email,
              display_name,
              avatar_url,
            }
          : undefined,
      };
    })
    .filter((avail) => avail.tutor !== undefined);

  return result;
}

/** Keyset cursor for availability rows (tutor browse at scale — offset is O(n)). */
export type TutorAvailabilityCursor = { start_time: string; id: string };

/**
 * Paginated open slots in the booking window. Uses (start_time, id) keyset — same filters as getTutorAvailability.
 */
export async function getTutorAvailabilityKeysetPage(opts: {
  course?: string;
  limit?: number;
  cursor?: TutorAvailabilityCursor | null;
}) {
  await requireRole(["student", "admin"]);

  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 100);
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const windowEnd = addDaysIso(new Date(), 14);
  const nowIso = new Date().toISOString();

  let q = supabase
    .from("availability")
    .select("*")
    .eq("active", true)
    .or("booking_status.eq.available,booking_status.is.null")
    .gte("start_time", nowIso)
    .lte("start_time", windowEnd)
    .order("start_time", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (opts.course) {
    q = q.eq("course", opts.course);
  }

  if (opts.cursor) {
    const c = opts.cursor;
    q = q.or(`start_time.gt.${c.start_time},and(start_time.eq.${c.start_time},id.gt.${c.id})`);
  }

  const { data, error } = await q;

  if (error) {
    throw new Error(`Failed to fetch availability page: ${error.message}`);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor: TutorAvailabilityCursor | null =
    hasMore && page.length > 0
      ? {
          start_time: page[page.length - 1]!.start_time,
          id: page[page.length - 1]!.id,
        }
      : null;

  if (page.length === 0) {
    return { rows: [], nextCursor: null };
  }

  const tutorIds = Array.from(new Set(page.map((a) => a.tutor_id)));
  const { data: tutors } = await adminClient
    .from("users")
    .select("id, role, approved")
    .in("id", tutorIds)
    .eq("approved", true);

  const { data: tutorSettings } = await adminClient
    .from("user_settings")
    .select("user_id, display_name, avatar_url")
    .in("user_id", tutorIds);

  const settingsByTutorId = new Map(
    (tutorSettings ?? []).map((row) => [
      row.user_id,
      {
        display_name: typeof row.display_name === "string" ? row.display_name.trim() || null : null,
        avatar_url: typeof row.avatar_url === "string" && row.avatar_url.length > 0 ? row.avatar_url : null,
      },
    ])
  );

  const approvedTutorIds = new Set(tutors?.map((t) => t.id) || []);
  const tutorIdArray = Array.from(approvedTutorIds);
  const tutorEmails = new Map<string, string>();
  const tutorMetaAvatar = new Map<string, string | null>();

  if (tutorIdArray.length > 0) {
    const { batchQueries } = await import("@/lib/performance");
    const emailQueries = tutorIdArray.map((tutorId) => async () => {
      try {
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(tutorId);
        if (!userError && userData?.user?.email) {
          const meta = userData.user.user_metadata as Record<string, unknown> | undefined;
          const avatarRaw = meta?.avatar_url ?? meta?.picture;
          const avatar = typeof avatarRaw === "string" && avatarRaw.length > 0 ? avatarRaw : null;
          return [tutorId, userData.user.email, avatar] as [string, string, string | null];
        }
      } catch {
        /* ignore */
      }
      return null;
    });
    const results = await batchQueries(emailQueries, 10);
    results.forEach((result) => {
      if (result) {
        tutorEmails.set(result[0], result[1]);
        tutorMetaAvatar.set(result[0], result[2] ?? null);
      }
    });
  }

  const result = page
    .filter((avail) => approvedTutorIds.has(avail.tutor_id))
    .map((avail) => {
      const tutor = tutors?.find((t) => t.id === avail.tutor_id);
      const email = tutorEmails.get(avail.tutor_id) || "";
      const settings = settingsByTutorId.get(avail.tutor_id);
      const avatar_url = settings?.avatar_url ?? tutorMetaAvatar.get(avail.tutor_id) ?? null;
      const display_name = settings?.display_name ?? (email ? email.split("@")[0] : null);
      return {
        ...avail,
        tutor: tutor
          ? {
              id: tutor.id,
              role: tutor.role,
              approved: tutor.approved,
              email,
              display_name,
              avatar_url,
            }
          : undefined,
      };
    })
    .filter((avail) => avail.tutor !== undefined);

  return { rows: result, nextCursor };
}

export async function getAvailableCourses() {
  await requireRole(["student", "admin"]);
  
  // Check cache first (2 minute TTL for course list)
  const cacheKey = "available-courses";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cached = (await import("@/lib/cache")).cache.get<string[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("availability")
    .select("course")
    .eq("active", true)
    .gte("start_time", new Date().toISOString())
    .order("course", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  const courses = Array.from(new Set((data || []).map((a) => a.course))).sort();
  
  // Cache for 2 minutes
  (await import("@/lib/cache")).cache.set(cacheKey, courses, 2 * 60 * 1000);
  
  return courses;
}

export async function getTutorExpertiseMap() {
  await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tutor_courses")
    .select("tutor_id, course_name, proof_description, verified");

  if (error) return {};

  const map: Record<string, { course_name: string; proof_description: string; verified: boolean }[]> = {};
  for (const row of data ?? []) {
    if (!map[row.tutor_id]) map[row.tutor_id] = [];
    map[row.tutor_id]!.push({
      course_name: row.course_name,
      proof_description: row.proof_description,
      verified: row.verified,
    });
  }
  return map;
}

export async function bookSession(availabilityId: string) {
  try {
    const user = await requireRole(["student", "admin"]);
    return bookSessionAsUser(availabilityId, user.id);
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("already have") ||
        message.includes("cannot book") ||
        message.includes("not approved") ||
        message.includes("not found") ||
        message.includes("rate limit") ||
        message.includes("invalid")
      ) {
        throw error;
      }
    }
    throw new Error(sanitizeError(error));
  }
}

export type BookSessionAsUserOptions = {
  /** When set, stores Stripe IDs on `session_requests` for automatic refund if tutor rejects. */
  stripeCheckoutSessionId?: string;
  /** Staging smoke only: skip live Stripe Checkout retrieval when the caller already validated the event. */
  skipStripeVerification?: boolean;
};

/**
 * Internal version of bookSession that accepts a userId directly.
 * Used by the Stripe webhook handler (unauthenticated context).
 */
export async function bookSessionAsUser(
  availabilityId: string,
  studentId: string,
  options?: BookSessionAsUserOptions
) {
  try {
    const adminClient = createAdminClient();

    const validAvailabilityId = validateUUID(availabilityId);
    const validStudentId = validateUUID(studentId);

    if (options?.stripeCheckoutSessionId) {
      const { data: existingByStripe } = await adminClient
        .from("session_requests")
        .select("*")
        .eq("stripe_checkout_session_id", options.stripeCheckoutSessionId)
        .maybeSingle();
      if (existingByStripe) {
        if (
          existingByStripe.student_id !== validStudentId ||
          existingByStripe.availability_id !== validAvailabilityId
        ) {
          throw new Error("Checkout session does not match this booking");
        }
        revalidatePath("/student");
        revalidatePath("/tutor");
        return { success: true, request: existingByStripe };
      }
    }

    const { data: availability, error: availError } = await adminClient
      .from("availability")
      .select("*")
      .eq("id", validAvailabilityId)
      .single();

    if (availError) {
      if (availError.code === "PGRST116") {
        throw new Error("Availability not found");
      }
      throw new Error(`Failed to fetch availability: ${availError.message}`);
    }

    if (!availability) {
      throw new Error("Availability not found");
    }

    if ((availability as { active?: boolean }).active === false) {
      throw new Error("This open slot is not accepting bookings");
    }

    // Verify tutor is approved
    const { data: tutor, error: tutorError } = await adminClient
      .from("users")
      .select("id, role, approved")
      .eq("id", availability.tutor_id)
      .single();

    if (tutorError) {
      throw new Error(`Failed to verify tutor: ${tutorError.message}`);
    }

    if (!tutor || !tutor.approved) {
      throw new Error("Tutor is not approved");
    }

    if (new Date(availability.start_time) <= new Date()) {
      throw new Error("Cannot book past availability");
    }

    // Check for student double-booking
    const { data: existingSession } = await adminClient
      .from("sessions")
      .select("id")
      .eq("student_id", validStudentId)
      .eq("start_time", availability.start_time)
      .single();

    if (existingSession) {
      throw new Error("You already have a session at this time");
    }

    // Check for duplicate pending request
    const { data: existingRequest } = await adminClient
      .from("session_requests")
      .select("id")
      .eq("student_id", validStudentId)
      .eq("availability_id", validAvailabilityId)
      .eq("status", "pending")
      .single();

    if (existingRequest) {
      throw new Error("You already have a pending request for this availability");
    }

    let stripeCheckoutSessionId: string | null = null;
    let stripePaymentIntentId: string | null = null;
    if (options?.stripeCheckoutSessionId && !options.skipStripeVerification) {
      const verified = await getVerifiedPaymentIntentForBooking(
        options.stripeCheckoutSessionId,
        {
          availabilityId: validAvailabilityId,
          studentId: validStudentId,
        }
      );
      stripeCheckoutSessionId = verified.checkoutSessionId;
      stripePaymentIntentId = verified.paymentIntentId;
    } else if (options?.stripeCheckoutSessionId) {
      stripeCheckoutSessionId = options.stripeCheckoutSessionId;
    }

    // Create session request
    const { data: request, error: requestError } = await adminClient
      .from("session_requests")
      .insert({
        student_id: validStudentId,
        tutor_id: availability.tutor_id,
        availability_id: validAvailabilityId,
        status: "pending",
        stripe_checkout_session_id: stripeCheckoutSessionId,
        stripe_payment_intent_id: stripePaymentIntentId,
      })
      .select()
      .single();

    if (requestError) {
      if (
        requestError.code === "23505" &&
        options?.stripeCheckoutSessionId
      ) {
        const { data: raced } = await adminClient
          .from("session_requests")
          .select("*")
          .eq("stripe_checkout_session_id", options.stripeCheckoutSessionId)
          .maybeSingle();
        if (
          raced &&
          raced.student_id === validStudentId &&
          raced.availability_id === validAvailabilityId
        ) {
          revalidatePath("/student");
          revalidatePath("/tutor");
          return { success: true, request: raced };
        }
      }
      if (requestError.code === "23505") {
        throw new Error("You already have a pending request for this availability");
      }
      if (requestError.code === "23503") {
        throw new Error("Invalid availability or tutor");
      }
      throw new Error(`Failed to create session request: ${requestError.message}`);
    }

    if (!request) {
      throw new Error("Failed to create session request");
    }

    // Fire-and-forget email notifications
    try {
      const [studentAuthData, tutorAuthData, settingsResult] = await Promise.all([
        adminClient.auth.admin.getUserById(validStudentId),
        adminClient.auth.admin.getUserById(availability.tutor_id),
        adminClient
          .from("user_settings")
          .select("user_id, display_name")
          .in("user_id", [validStudentId, availability.tutor_id]),
      ]);
      const studentEmail = studentAuthData.data?.user?.email;
      const tutorEmail = tutorAuthData.data?.user?.email;
      const nameByUser = Object.fromEntries(
        (settingsResult.data ?? []).map((r) => [r.user_id, r.display_name as string | null])
      );
      if (studentEmail && tutorEmail) {
        const priceCents =
          (availability as { price_per_session?: number | null }).price_per_session ?? null;
        const sessionDetails: SessionEmailDetails = {
          sessionId: request.id,
          course: availability.course,
          startTime: availability.start_time,
          endTime: availability.end_time,
          studentDisplayName: nameByUser[validStudentId] ?? null,
          tutorDisplayName: nameByUser[availability.tutor_id] ?? null,
          priceCents,
        };
        void sendSessionBookedEmail(studentEmail, tutorEmail, sessionDetails);
      }
    } catch (emailErr) {
      console.error("[bookSessionAsUser] email notification failed:", emailErr);
    }

    // Track booking events
    void trackEvent("session_booked", {
      userId: studentId,
      properties: {
        course: String(availability.course ?? ""),
        tutor_id: String(availability.tutor_id ?? ""),
      },
    });
    // Check if this is the student's first booked session
    try {
      const { count } = await adminClient
        .from("session_requests")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("status", "approved");
      if ((count ?? 0) <= 1) {
        void trackEvent("first_session_booked", { userId: studentId });
      }
    } catch { /* non-critical */ }

    revalidatePath("/student");
    revalidatePath("/tutor");
    return { success: true, request };
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("already have") ||
        message.includes("cannot book") ||
        message.includes("not approved") ||
        message.includes("not found") ||
        message.includes("rate limit") ||
        message.includes("invalid") ||
        message.includes("checkout")
      ) {
        throw error;
      }
    }
    throw new Error(sanitizeError(error));
  }
}

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
        ? (await getDivisionKeyForCourse(session.course)) ?? "general"
        : "general";
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
    adminClient.from("sessions").select("*").eq("student_id", studentId).lt("end_time", now),
    adminClient
      .from("sessions")
      .select("*")
      .eq("student_id", studentId)
      .in("status", ["completed", "cancelled"])
      .gte("end_time", now),
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
      .order("start_time", { ascending: true }),
    adminClient
      .from("availability")
      .select("course")
      .eq("active", true)
      .gte("start_time", now)
      .order("course", { ascending: true }),
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

  const { data: pkgRowsAdmin } =
    sessionIds.length > 0
      ? await adminClient
          .from("session_ai_packages")
          .select("*")
          .in("session_id", sessionIds)
          .not("package_published_at", "is", null)
      : { data: [] as SessionAiPackage[] };

  const pkgBySessionAdmin = new Map(
    (pkgRowsAdmin ?? []).map((p) => [p.session_id, p as SessionAiPackage])
  );

  const pastSessions = pastWithTutors.map((s) => ({
    ...s,
    ratings: ratings.filter((r) => r.session_id === s.id),
    ai_package: pkgBySessionAdmin.get(s.id) ?? null,
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

  return {
    studentId,
    email,
    upcomingSessions,
    pastSessions,
    availability,
    courses,
    totalXp,
    streak,
  };
}

// ============================================================
// STUDENT COURSE INTERESTS
// ============================================================

function isMissingStudentCoursesRelation(error: { message?: string; code?: string }): boolean {
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

export async function getStudentCourses() {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_courses")
    .select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingStudentCoursesRelation(error)) return [];
    const msg = "message" in error && typeof (error as { message?: string }).message === "string"
      ? (error as { message: string }).message
      : sanitizeError(error);
    throw new Error(`Failed to fetch student courses: ${msg}`);
  }
  return data ?? [];
}

export async function addStudentCourse(courseName: string) {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const validName = sanitizeCourseName(validateCourse(courseName));

  const { error } = await supabase
    .from("student_courses")
    .insert({ student_id: user.id, course_name: validName });

  if (error) {
    if (error.code === "23505") throw new Error("You already added this course");
    throw new Error(`Failed to add course: ${sanitizeError(error)}`);
  }

  revalidatePath("/student");
  return { success: true };
}

export async function removeStudentCourse(courseId: string) {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const validId = validateUUID(courseId);

  const { error } = await supabase
    .from("student_courses")
    .delete()
    .eq("id", validId)
    .eq("student_id", user.id);

  if (error) throw new Error(`Failed to remove course: ${sanitizeError(error)}`);

  revalidatePath("/student");
  return { success: true };
}

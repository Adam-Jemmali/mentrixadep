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
import { awardXp, getDivisionKeyForCourse } from "@/app/actions/quest";
import {
  sendSessionBookedEmail,
  type SessionEmailDetails,
} from "@/lib/email";

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

  return (data || []).map((session) => ({
    ...session,
    tutor: { id: session.tutor_id, role: "tutor" },
  }));
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
  const { data: ratings } = await supabase
    .from("ratings")
    .select("*")
    .in("session_id", sessionIds)
    .eq("student_id", user.id);

  return sessions.map((session) => ({
    ...session,
    tutor: { id: session.tutor_id, role: "tutor" },
    ratings: (ratings || []).filter((r) => r.session_id === session.id),
  }));
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

  if (minutesUntilStart <= 60) {
    throw new Error("Cannot cancel session less than 60 minutes before start time");
  }

  const { error: updateError } = await client
    .from("sessions")
    .update({ status: "cancelled" })
    .eq("id", sessionId)
    .eq("student_id", actingAsId);

  if (updateError) {
    throw new Error(`Failed to cancel session: ${updateError.message}`);
  }

  revalidatePath("/student");
  return { success: true };
}

export async function getTutorAvailability(course?: string) {
  await requireRole(["student", "admin"]);

  // Check cache first (1 minute TTL for availability data)
  const cacheKey = `tutor-availability:${course || "all"}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cached = (await import("@/lib/cache")).cache.get<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  let query = supabase
    .from("availability")
    .select("*")
    .gte("start_time", new Date().toISOString())
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

  // Fetch tutor emails in parallel batches using optimized batching
  const tutorEmails = new Map<string, string>();

  if (approvedTutorIds.size > 0) {
    const tutorIdArray = Array.from(approvedTutorIds);
    const { batchQueries } = await import("@/lib/performance");
    
    const emailQueries = tutorIdArray.map((tutorId) => async () => {
      try {
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(tutorId);
        if (!userError && userData?.user?.email) {
          return [tutorId, userData.user.email] as [string, string];
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
      }
    });
  }

  const result = data
    .filter((avail) => approvedTutorIds.has(avail.tutor_id))
    .map((avail) => {
      const tutor = tutors?.find((t) => t.id === avail.tutor_id);
      const email = tutorEmails.get(avail.tutor_id) || "";

      return {
        ...avail,
        tutor: tutor
          ? { id: tutor.id, role: tutor.role, approved: tutor.approved, email }
          : undefined,
      };
    })
    .filter((avail) => avail.tutor !== undefined);

  // Cache for 1 minute
  (await import("@/lib/cache")).cache.set(cacheKey, result, 60 * 1000);

  return result;
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

/**
 * Internal version of bookSession that accepts a userId directly.
 * Used by the Stripe webhook handler (unauthenticated context).
 */
export async function bookSessionAsUser(availabilityId: string, studentId: string) {
  try {
    const adminClient = createAdminClient();

    const validAvailabilityId = validateUUID(availabilityId);
    const validStudentId = validateUUID(studentId);

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

    // Create session request
    const { data: request, error: requestError } = await adminClient
      .from("session_requests")
      .insert({
        student_id: validStudentId,
        tutor_id: availability.tutor_id,
        availability_id: validAvailabilityId,
        status: "pending",
      })
      .select()
      .single();

    if (requestError) {
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
      const [studentAuthData, tutorAuthData] = await Promise.all([
        adminClient.auth.admin.getUserById(validStudentId),
        adminClient.auth.admin.getUserById(availability.tutor_id),
      ]);
      const studentEmail = studentAuthData.data?.user?.email;
      const tutorEmail = tutorAuthData.data?.user?.email;
      if (studentEmail && tutorEmail) {
        const sessionDetails: SessionEmailDetails = {
          sessionId: request.id,
          course: availability.course,
          startTime: availability.start_time,
          endTime: availability.end_time,
        };
        void sendSessionBookedEmail(studentEmail, tutorEmail, sessionDetails);
      }
    } catch (emailErr) {
      console.error("[bookSessionAsUser] email notification failed:", emailErr);
    }

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
        message.includes("invalid")
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

      const SESSION_COMPLETION_XP = 15;
      const divisionKey = session.course
        ? (await getDivisionKeyForCourse(session.course)) ?? "general"
        : "general";
      try {
        await awardXp(actingAsId, SESSION_COMPLETION_XP, divisionKey);
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
      .gte("start_time", now)
      .order("start_time", { ascending: true }),
    adminClient
      .from("availability")
      .select("course")
      .gte("start_time", now)
      .order("course", { ascending: true }),
  ]);

  const upcomingSessions = (upcomingResult.data ?? []).map((s) => ({
    ...s,
    tutor: { id: s.tutor_id, role: "tutor" as const },
  }));

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

  const pastSessions = pastSessionsRaw.map((s) => ({
    ...s,
    tutor: { id: s.tutor_id, role: "tutor" as const },
    ratings: ratings.filter((r) => r.session_id === s.id),
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

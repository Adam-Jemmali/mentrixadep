"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  sendSessionApprovedEmail,
  type SessionEmailDetails,
} from "@/lib/email";
import { createRefundForRejectedRequest } from "@/lib/stripe-session-booking";
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

export async function getTutorAvailability() {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .eq("tutor_id", user.id)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch availability: ${error.message}`);
  }

  return data || [];
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

    const { data: existing, error: checkError } = await adminClient
      .from("availability")
      .select("id")
      .eq("tutor_id", actingAsId)
      .eq("course", validCourse)
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
      .eq("course", validCourse);

    if (fetchError) {
      throw new Error(`Failed to check overlapping availability: ${fetchError.message}`);
    }

    const hasOverlap = (allAvailability || []).some((avail) => {
      const availStart = new Date(avail.start_time);
      const availEnd = new Date(avail.end_time);
      return (
        (availStart <= start && availEnd > start) ||
        (availStart < end && availEnd >= end) ||
        (availStart >= start && availEnd <= end)
      );
    });

    if (hasOverlap) {
      throw new Error("Overlapping availability slots are not allowed");
    }

    // Only block if an *upcoming* scheduled session overlaps this availability window.
    // Ignore cancelled/completed/past rows — they were incorrectly blocking new slots.
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

    const windowStart = start.getTime();
    const windowEnd = end.getTime();
    const hasSessionConflict = (upcomingSessions ?? []).some((s) => {
      const s0 = new Date(s.start_time).getTime();
      const s1 = new Date(s.end_time).getTime();
      return s0 < windowEnd && s1 > windowStart;
    });

    if (hasSessionConflict) {
      throw new Error("Tutor already has a session at this time");
    }

    const { data, error } = await adminClient
      .from("availability")
      .insert({
        tutor_id: actingAsId,
        course: validCourse,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        price_per_session: pricePerSession,
      })
      .select()
      .single();

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
  if (sessions.length === 0) return [];

  const adminClient = createAdminClient();
  const studentIds = Array.from(new Set(sessions.map((s) => s.student_id)));
  const emailMap: Record<string, string> = {};
  await Promise.all(
    studentIds.map(async (sid) => {
      try {
        const { data: authData } = await adminClient.auth.admin.getUserById(sid);
        if (authData?.user?.email) emailMap[sid] = authData.user.email;
      } catch {
        // best-effort
      }
    })
  );

  return sessions.map((session) => ({
    ...session,
    student: { id: session.student_id },
    student_email: emailMap[session.student_id] ?? null,
  }));
}

export async function getPastSessions() {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [{ data: endedRows, error: endedErr }, { data: closedEarlyRows, error: earlyErr }] =
    await Promise.all([
      supabase.from("sessions").select("*").eq("tutor_id", user.id).lt("end_time", nowIso),
      supabase
        .from("sessions")
        .select("*")
        .eq("tutor_id", user.id)
        .in("status", ["completed", "cancelled"])
        .gte("end_time", nowIso),
    ]);

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
  const studentIds = Array.from(new Set(sessions.map((s) => s.student_id)));
  const emailMap: Record<string, string> = {};
  await Promise.all(
    studentIds.map(async (sid) => {
      try {
        const { data: authData } = await adminClient.auth.admin.getUserById(sid);
        if (authData?.user?.email) emailMap[sid] = authData.user.email;
      } catch {
        // best-effort
      }
    })
  );

  return sessions.map((session) => ({
    ...session,
    student: { id: session.student_id },
    student_email: emailMap[session.student_id] ?? null,
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
  const emailMap: Record<string, string> = {};
  await Promise.all(
    studentIds.map(async (sid) => {
      try {
        const { data: authData } = await adminClient.auth.admin.getUserById(sid);
        if (authData?.user?.email) emailMap[sid] = authData.user.email;
      } catch {
        // best-effort
      }
    })
  );

  return requests.map((r) => ({
    ...r,
    student_email: emailMap[r.student_id] ?? null,
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
  const client = user.role === "admin" && onBehalfOfUserId ? createAdminClient() : await createClient();

  const { data: request, error: requestError } = await client
    .from("session_requests")
    .select(`*, availability:availability(*)`)
    .eq("id", validRequestId)
    .single();

  if (requestError || !request) {
    throw new Error("Session request not found");
  }

  if (request.tutor_id !== actingAsId && user.role !== "admin") {
    throw new Error("You don't have permission to approve this request");
  }

  if (request.status !== "pending") {
    throw new Error("Request is not pending");
  }

  if (!request.availability) {
    throw new Error("Availability not found");
  }

  const tutorId = request.tutor_id;

  // Check for tutor double-booking
  const { data: existingSession, error: checkError } = await client
    .from("sessions")
    .select("id")
    .eq("tutor_id", tutorId)
    .eq("start_time", request.availability.start_time)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw new Error(`Failed to check existing sessions: ${checkError.message}`);
  }

  if (existingSession) {
    throw new Error("Tutor already has a session at this time");
  }

  // Check for student double-booking
  const { data: existingStudentSession, error: studentCheckError } = await client
    .from("sessions")
    .select("id")
    .eq("student_id", request.student_id)
    .eq("start_time", request.availability.start_time)
    .single();

  if (studentCheckError && studentCheckError.code !== "PGRST116") {
    throw new Error(`Failed to check student sessions: ${studentCheckError.message}`);
  }

  if (existingStudentSession) {
    throw new Error("Student already has a session at this time");
  }

  const priceCents =
    (request.availability as { price_per_session?: number } | undefined)?.price_per_session ?? 2500;

  // Create the session
  const { data: session, error: sessionError } = await client
    .from("sessions")
    .insert({
      student_id: request.student_id,
      tutor_id: tutorId,
      course: request.availability.course,
      start_time: request.availability.start_time,
      end_time: request.availability.end_time,
      completed: false,
      price_per_session: priceCents,
    })
    .select()
    .single();

  if (sessionError) {
    throw new Error(`Failed to create session: ${sessionError.message}`);
  }

  // Remove the consumed availability slot
  const { error: deleteAvailError } = await client
    .from("availability")
    .delete()
    .eq("id", request.availability_id);

  if (deleteAvailError) {
    console.error("Failed to delete availability after approval:", deleteAvailError);
  }

  // Mark request as approved
  const { error: updateError } = await client
    .from("session_requests")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", validRequestId);

  if (updateError) {
    throw new Error(`Failed to update request status: ${updateError.message}`);
  }

  // Fire-and-forget email to student
  try {
    const adminClient = createAdminClient();
    const studentAuthData = await adminClient.auth.admin.getUserById(request.student_id);
    const studentEmail = studentAuthData.data?.user?.email;
    if (studentEmail && session) {
      const sessionDetails: SessionEmailDetails = {
        sessionId: session.id,
        course: session.course,
        startTime: session.start_time,
        endTime: session.end_time,
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

  const { error: updateError } = await client
    .from("sessions")
    .update({ status: "cancelled" })
    .eq("id", validSessionId)
    .eq("tutor_id", actingAsId);

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

export async function getTutorPublicProfile(tutorId: string) {
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

  // Fetch available slots
  const { data: slots } = await adminClient
    .from("availability")
    .select("id, course, start_time, end_time, price_per_session")
    .eq("tutor_id", tutorId)
    .gte("start_time", new Date().toISOString())
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

  const [availResult, upcomingResult, pastResult, reqAvailResult, tutorCoursesResult] = await Promise.all([
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
  ]);

  const availability = availResult.data ?? [];
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

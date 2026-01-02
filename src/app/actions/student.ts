"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  validateUUID,
  validateRating,
  validateComment,
  sanitizeError,
} from "@/lib/security";
import { enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/lib/rate-limit";

export async function getUpcomingSessions() {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", user.id)
    .gte("start_time", new Date().toISOString())
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

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", user.id)
    .lt("start_time", new Date().toISOString())
    .order("start_time", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch past sessions: ${error.message}`);
  }

  if (!sessions || sessions.length === 0) {
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

export async function cancelSession(sessionId: string) {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("student_id", user.id)
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

  const { error: deleteError } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (deleteError) {
    throw new Error(`Failed to cancel session: ${deleteError.message}`);
  }

  revalidatePath("/student");
  return { success: true };
}

export async function getTutorAvailability(course?: string) {
  await requireRole(["student", "admin"]);
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
  
  // Use admin client to fetch tutor data to bypass RLS
  const { data: tutors } = await adminClient
    .from("users")
    .select("id, role, approved")
    .in("id", tutorIds)
    .eq("approved", true);

  const approvedTutorIds = new Set(tutors?.map((t) => t.id) || []);

  // Get tutor emails from auth.users using admin client
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  const tutorEmails = new Map(
    authUsers.users
      .filter((u) => approvedTutorIds.has(u.id))
      .map((u) => [u.id, u.email || ""])
  );
  
  // If no approved tutors found, still try to get emails for all tutor IDs
  // This helps debug if the issue is with approval status
  if (approvedTutorIds.size === 0 && tutorIds.length > 0) {
    const allTutorEmails = new Map(
      authUsers.users
        .filter((u) => tutorIds.includes(u.id))
        .map((u) => [u.id, u.email || ""])
    );
    console.warn("No approved tutors found. Tutor IDs:", tutorIds);
    console.warn("Available emails:", Array.from(allTutorEmails.entries()));
  }

  const result = data
    .filter((avail) => approvedTutorIds.has(avail.tutor_id))
    .map((avail) => {
      const tutor = tutors?.find((t) => t.id === avail.tutor_id);
      const email = tutorEmails.get(avail.tutor_id) || "";
      
      return {
        ...avail,
        tutor: tutor
          ? {
              id: tutor.id,
              role: tutor.role,
              approved: tutor.approved,
              email: email,
            }
          : undefined,
      };
    })
    .filter((avail) => avail.tutor !== undefined); // Only return items with valid tutor data

  return result;
}

export async function getAvailableCourses() {
  await requireRole(["student", "admin"]);
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
  return courses;
}

export async function bookSession(availabilityId: string) {
  try {
    const user = await requireRole(["student", "admin"]);
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Rate limiting
    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.bookSession,
      "book session"
    );

    // Validate UUID
    const validAvailabilityId = validateUUID(availabilityId);

    const { data: availability, error: availError } = await supabase
      .from("availability")
      .select("*")
      .eq("id", validAvailabilityId)
      .single();

  if (availError || !availability) {
    throw new Error("Availability not found");
  }

  // Use admin client to check tutor approval status to bypass RLS
  const { data: tutor } = await adminClient
    .from("users")
    .select("id, role, approved")
    .eq("id", availability.tutor_id)
    .single();

  if (!tutor || !tutor.approved) {
    throw new Error("Tutor is not approved");
  }

  if (new Date(availability.start_time) <= new Date()) {
    throw new Error("Cannot book past availability");
  }

  const { data: existingSession, error: checkError } = await supabase
    .from("sessions")
    .select("id")
    .eq("student_id", user.id)
    .eq("start_time", availability.start_time)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw new Error(`Failed to check existing sessions: ${checkError.message}`);
  }

  if (existingSession) {
    throw new Error("You already have a session at this time");
  }

  const { data: existingRequest, error: requestCheckError } = await supabase
    .from("session_requests")
    .select("id")
    .eq("student_id", user.id)
    .eq("availability_id", availabilityId)
    .eq("status", "pending")
    .single();

  if (requestCheckError && requestCheckError.code !== "PGRST116") {
    throw new Error(`Failed to check existing requests: ${requestCheckError.message}`);
  }

  if (existingRequest) {
    throw new Error("You already have a pending request for this availability");
  }

  const { data: request, error: requestError } = await supabase
    .from("session_requests")
    .insert({
      student_id: user.id,
      tutor_id: availability.tutor_id,
      availability_id: availabilityId,
      status: "pending",
    })
    .select()
    .single();

  if (requestError) {
    throw new Error(`Failed to create session request: ${requestError.message}`);
  }

    revalidatePath("/student");
    return { success: true, request };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export async function rateSession(sessionId: string, rating: number, comment?: string) {
  try {
    const user = await requireRole(["student", "admin"]);
    const supabase = await createClient();

    // Rate limiting
    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.rateSession,
      "rate session"
    );

    // Validate inputs
    const validSessionId = validateUUID(sessionId);
    const validRating = validateRating(rating);
    const validComment = validateComment(comment);

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", validSessionId)
      .eq("student_id", user.id)
      .single();

  if (sessionError || !session) {
    throw new Error("Session not found or you don't have permission");
  }

  if (!session.completed) {
    throw new Error("Cannot rate incomplete session");
  }

  if (new Date(session.start_time) > new Date()) {
    throw new Error("Cannot rate future session");
  }

  const { data: existingRating, error: checkError } = await supabase
    .from("ratings")
    .select("id")
    .eq("session_id", sessionId)
    .eq("student_id", user.id)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw new Error(`Failed to check existing rating: ${checkError.message}`);
  }

  if (existingRating) {
    const { error: updateError } = await supabase
      .from("ratings")
      .update({
        rating: validRating,
        comment: validComment || null,
      })
      .eq("id", existingRating.id);

    if (updateError) {
      throw new Error(`Failed to update rating: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase
      .from("ratings")
      .insert({
        session_id: validSessionId,
        student_id: user.id,
        tutor_id: session.tutor_id,
        rating: validRating,
        comment: validComment || null,
      });

    if (insertError) {
      throw new Error(`Failed to create rating: ${insertError.message}`);
    }
  }

    revalidatePath("/student");
    return { success: true };
  } catch (error) {
    throw new Error(sanitizeError(error));
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

  if (!session.completed) {
    return { canRate: false, reason: "Session not completed" };
  }

  const sessionEnd = new Date(session.end_time);
  const now = new Date();

  if (sessionEnd > now) {
    return { canRate: false, reason: "Session has not ended yet" };
  }

  return { canRate: true };
}


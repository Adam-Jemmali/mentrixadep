"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  validateCourse,
  validateUUID,
  sanitizeCourseName,
  sanitizeError,
} from "@/lib/security";
import { enforceRateLimit, RATE_LIMITS, getRateLimitId } from "@/lib/rate-limit";

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

export async function createAvailability(course: string, startTime: string) {
  try {
    const user = await requireRole(["tutor", "admin"]);
    const supabase = await createClient();

    // Rate limiting
    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.createAvailability,
      "create availability"
    );

    // Validate and sanitize inputs
    const validCourse = sanitizeCourseName(validateCourse(course));
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      throw new Error("Invalid date/time");
    }
    const end = new Date(start.getTime() + 30 * 60 * 1000);

  const { data: existing, error: checkError } = await supabase
    .from("availability")
    .select("id")
    .eq("tutor_id", user.id)
    .eq("course", validCourse)
    .eq("start_time", start.toISOString())
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw new Error(`Failed to check existing availability: ${checkError.message}`);
  }

  if (existing) {
    throw new Error("Availability slot already exists");
  }

  const { data: allAvailability, error: fetchError } = await supabase
    .from("availability")
    .select("start_time, end_time")
    .eq("tutor_id", user.id)
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

  const { data: existingSessions, error: sessionCheckError } = await supabase
    .from("sessions")
    .select("start_time")
    .eq("tutor_id", user.id)
    .eq("start_time", start.toISOString());

  if (sessionCheckError) {
    throw new Error(`Failed to check existing sessions: ${sessionCheckError.message}`);
  }

  if (existingSessions && existingSessions.length > 0) {
    throw new Error("You already have a session at this time");
  }

    const { data, error } = await supabase
      .from("availability")
      .insert({
        tutor_id: user.id,
        course: validCourse,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create availability: ${sanitizeError(error)}`);
    }

    revalidatePath("/tutor");
    return { success: true, availability: data };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export async function deleteAvailability(availabilityId: string) {
  try {
    const user = await requireRole(["tutor", "admin"]);
    const supabase = await createClient();

    // Validate UUID
    const validAvailabilityId = validateUUID(availabilityId);

    const { data: availability, error: checkError } = await supabase
      .from("availability")
      .select("tutor_id")
      .eq("id", validAvailabilityId)
      .single();

  if (checkError || !availability) {
    throw new Error("Availability not found");
  }

  if (availability.tutor_id !== user.id) {
    throw new Error("You don't have permission to delete this availability");
  }

    const { error } = await supabase
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

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("tutor_id", user.id)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch upcoming sessions: ${error.message}`);
  }

  return (data || []).map((session) => ({
    ...session,
    student: { id: session.student_id },
  }));
}

export async function getPastSessions() {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("tutor_id", user.id)
    .lt("start_time", new Date().toISOString())
    .order("start_time", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch past sessions: ${error.message}`);
  }

  return (data || []).map((session) => ({
    ...session,
    student: { id: session.student_id },
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
    .select(
      `
      *,
      availability:availability(*)
      `
    )
    .in("availability_id", availabilityIds)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch session requests: ${error.message}`);
  }

  return data || [];
}

export async function approveSessionRequest(requestId: string) {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const { data: request, error: requestError } = await supabase
    .from("session_requests")
    .select(
      `
      *,
      availability:availability(*)
      `
    )
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    throw new Error("Session request not found");
  }

  if (request.tutor_id !== user.id) {
    throw new Error("You don't have permission to approve this request");
  }

  if (request.status !== "pending") {
    throw new Error("Request is not pending");
  }

  if (!request.availability) {
    throw new Error("Availability not found");
  }

  const { data: existingSession, error: checkError } = await supabase
    .from("sessions")
    .select("id")
    .eq("tutor_id", user.id)
    .eq("start_time", request.availability.start_time)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw new Error(`Failed to check existing sessions: ${checkError.message}`);
  }

  if (existingSession) {
    throw new Error("You already have a session at this time");
  }

  const { data: existingStudentSession, error: studentCheckError } = await supabase
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

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      student_id: request.student_id,
      tutor_id: user.id,
      course: request.availability.course,
      start_time: request.availability.start_time,
      end_time: request.availability.end_time,
      completed: false,
    })
    .select()
    .single();

  if (sessionError) {
    throw new Error(`Failed to create session: ${sessionError.message}`);
  }

  const { error: deleteAvailError } = await supabase
    .from("availability")
    .delete()
    .eq("id", request.availability_id);

  if (deleteAvailError) {
    console.error("Failed to delete availability after approval:", deleteAvailError);
  }

  const { error: updateError } = await supabase
    .from("session_requests")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    throw new Error(`Failed to update request status: ${updateError.message}`);
  }

  revalidatePath("/tutor");
  revalidatePath("/student");
  return { success: true, session };
}

export async function rejectSessionRequest(requestId: string) {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const { data: request, error: requestError } = await supabase
    .from("session_requests")
    .select("tutor_id")
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    throw new Error("Session request not found");
  }

  if (request.tutor_id !== user.id) {
    throw new Error("You don't have permission to reject this request");
  }

  const { error } = await supabase
    .from("session_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    throw new Error(`Failed to reject request: ${error.message}`);
  }

  revalidatePath("/tutor");
  return { success: true };
}

export async function cancelSession(sessionId: string) {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("tutor_id", user.id)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found or you don't have permission");
  }

  const { error: deleteError } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (deleteError) {
    throw new Error(`Failed to cancel session: ${deleteError.message}`);
  }

  revalidatePath("/tutor");
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

export async function toggleAutoApprove(enabled: boolean) {
  const user = await requireRole(["tutor", "admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({ auto_approve: enabled })
    .eq("id", user.id);

  if (error) {
    throw new Error(`Failed to update auto-approve setting: ${error.message}`);
  }

  revalidatePath("/tutor");
  return { success: true };
}


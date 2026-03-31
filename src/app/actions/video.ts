"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { validateUUID } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

/**
 * Create a video room for a session (participants may join early; room expires after session end).
 */
export async function createVideoRoom(sessionId: string) {
  const user = await requireAuth();
  const validatedSessionId = validateUUID(sessionId);
  const adminClient = createAdminClient();

  // Fetch session details
  const { data: session, error: sessionError } = await adminClient
    .from("sessions")
    .select("*")
    .eq("id", validatedSessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found");
  }

  // Verify user is either student or tutor for this session
  if (session.student_id !== user.id && session.tutor_id !== user.id) {
    throw new Error("Unauthorized: You are not part of this session");
  }

  // Check if room already exists
  const { data: existingRoom } = await adminClient
    .from("video_rooms")
    .select("*")
    .eq("session_id", validatedSessionId)
    .single();

  if (existingRoom && existingRoom.active) {
    // Return existing room if still active
    return {
      success: true,
      room: existingRoom,
    };
  }

  // Generate secure room token
  const roomToken = randomBytes(32).toString("base64");

  // Room expires 24 hours after session end to give plenty of time
  const sessionEnd = new Date(session.end_time);
  const expiresAt = new Date(sessionEnd.getTime() + 24 * 60 * 60 * 1000);

  // Create video room using admin client to bypass RLS
  const { data: room, error: roomError } = await adminClient
    .from("video_rooms")
    .insert({
      session_id: validatedSessionId,
      room_token: roomToken,
      active: true,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (roomError) {
    throw new Error(`Failed to create video room: ${roomError.message}`);
  }

  // Add user as participant
  const userRole = session.student_id === user.id ? "student" : "tutor";
  const { error: participantError } = await adminClient
    .from("call_participants")
    .insert({
      room_id: room.id,
      user_id: user.id,
      role: userRole,
    });

  if (participantError) {
    // If participant insert fails, still return room (user can join later)
    console.error("Failed to add participant:", participantError);
  }

  revalidatePath(`/video/session/${validatedSessionId}`);
  return {
    success: true,
    room,
  };
}

/**
 * Validate if a user can join a video room
 * Enforces time window and session ownership
 */
export async function validateJoinRequest(sessionId: string) {
  const user = await requireAuth();
  const validatedSessionId = validateUUID(sessionId);

  const adminClient = createAdminClient();

  // Fetch session and room
  const { data: session, error: sessionError } = await adminClient
    .from("sessions")
    .select("*")
    .eq("id", validatedSessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found");
  }

  // Verify user is either student or tutor
  if (session.student_id !== user.id && session.tutor_id !== user.id) {
    throw new Error("Unauthorized: You are not part of this session");
  }

  // Fetch video room
  const { data: room, error: roomError } = await adminClient
    .from("video_rooms")
    .select("*")
    .eq("session_id", validatedSessionId)
    .single();

  if (roomError || !room) {
    throw new Error("Video room not found. Please create a room first.");
  }

  if (!room.active) {
    throw new Error("Video room is no longer active");
  }

  if (new Date(room.expires_at) < new Date()) {
    throw new Error("Video room has expired");
  }

  // Determine user role
  const userRole = session.student_id === user.id ? "student" : "tutor";

  // Check if user is already a participant
  const { data: existingParticipant } = await adminClient
    .from("call_participants")
    .select("*")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .single();

  if (!existingParticipant) {
    // Add user as participant
    const { error: participantError } = await adminClient
      .from("call_participants")
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: userRole,
      });

    if (participantError) {
      throw new Error(`Failed to join room: ${participantError.message}`);
    }
  } else if (existingParticipant.left_at) {
    // Re-join if previously left
    const { error: updateError } = await adminClient
      .from("call_participants")
      .update({
        left_at: null,
        joined_at: new Date().toISOString(),
      })
      .eq("id", existingParticipant.id);

    if (updateError) {
      throw new Error(`Failed to rejoin room: ${updateError.message}`);
    }
  }

  return {
    success: true,
    room,
    role: userRole,
  };
}

/**
 * Close a video room (mark as inactive)
 * Only session participants or admin can close
 */
export async function closeVideoRoom(sessionId: string) {
  const user = await requireAuth();
  const validatedSessionId = validateUUID(sessionId);

  const adminClient = createAdminClient();

  // Fetch session
  const { data: session, error: sessionError } = await adminClient
    .from("sessions")
    .select("*")
    .eq("id", validatedSessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found");
  }

  // Verify user is either student, tutor, or admin
  const isAdmin = user.role === "admin";
  if (session.student_id !== user.id && session.tutor_id !== user.id && !isAdmin) {
    throw new Error("Unauthorized: You cannot close this room");
  }

  // Mark room as inactive
  const { error: updateError } = await adminClient
    .from("video_rooms")
    .update({ active: false })
    .eq("session_id", validatedSessionId);

  if (updateError) {
    throw new Error(`Failed to close video room: ${updateError.message}`);
  }

  // Mark all participants as left
  const { data: room } = await adminClient
    .from("video_rooms")
    .select("id")
    .eq("session_id", validatedSessionId)
    .single();

  if (room) {
    await adminClient
      .from("call_participants")
      .update({ left_at: new Date().toISOString() })
      .eq("room_id", room.id)
      .is("left_at", null);
  }

  revalidatePath(`/video/session/${validatedSessionId}`);
  return {
    success: true,
  };
}

/**
 * Get video room details for a session
 */
export async function getVideoRoom(sessionId: string) {
  const user = await requireAuth();
  const validatedSessionId = validateUUID(sessionId);

  const supabase = await createClient();

  // Fetch session to verify ownership
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", validatedSessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found");
  }

  if (session.student_id !== user.id && session.tutor_id !== user.id && user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  // Fetch video room
  const { data: room, error: roomError } = await supabase
    .from("video_rooms")
    .select("*")
    .eq("session_id", validatedSessionId)
    .single();

  if (roomError || !room) {
    return null;
  }

  return room;
}

/**
 * Leave video room (mark participant as left)
 */
export async function leaveVideoRoom(sessionId: string) {
  const user = await requireAuth();
  const validatedSessionId = validateUUID(sessionId);

  const adminClient = createAdminClient();

  // Get room
  const { data: room } = await adminClient
    .from("video_rooms")
    .select("id")
    .eq("session_id", validatedSessionId)
    .single();

  if (!room) {
    return { success: true }; // Already closed
  }

  // Mark participant as left
  await adminClient
    .from("call_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .is("left_at", null);

  return { success: true };
}


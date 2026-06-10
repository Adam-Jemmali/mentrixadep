"use server";

import { createClient } from "@/shared/integrations/supabase/server";
import { requireAuth } from "@/shared/core/auth";
import { VideoRecording } from "@/shared/types/database";
import { sanitizeError, validateUUID } from "@/shared/core/security";
import { saveSessionRecordingFromFormData } from "@/features/video/save-session-recording";

/**
 * Saves a video recording (Server Action). Prefer `POST /api/recordings/upload` from the
 * browser for large files — Server Actions default to a small request body limit.
 */
export async function saveRecording(
  formData: FormData,
): Promise<{ success: boolean; recording?: VideoRecording; error?: string }> {
  try {
    return await saveSessionRecordingFromFormData(formData);
  } catch (error) {
    console.error("saveRecording server action error:", error);
    if (error instanceof Error) {
      return { success: false, error: `Error: ${error.message}` };
    }
    return { success: false, error: sanitizeError(error) };
  }
}

/**
 * Gets all recordings for a session.
 * Accessible by session participants and admins.
 */
export async function getSessionRecordings(
  sessionId: string
): Promise<{ recordings?: VideoRecording[]; error?: string }> {
  try {
    await requireAuth(); // Ensure user is authenticated
    const supabase = await createClient();

    const validSessionId = validateUUID(sessionId);

    const { data: recordings, error } = await supabase
      .from("video_recordings")
      .select("*")
      .eq("session_id", validSessionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching recordings:", error);
      return { error: "Failed to fetch recordings" };
    }

    return { recordings: (recordings || []) as VideoRecording[] };
  } catch (error) {
    console.error("getSessionRecordings server action error:", error);
    return { error: sanitizeError(error) };
  }
}

/**
 * Gets a signed URL for downloading/viewing a recording.
 */
export async function getRecordingUrl(
  recordingId: string
): Promise<{ url?: string; error?: string }> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const validRecordingId = validateUUID(recordingId);

    // Get recording to verify access
    const { data: recording, error: fetchError } = await supabase
      .from("video_recordings")
      .select("storage_path")
      .eq("id", validRecordingId)
      .single();

    if (fetchError || !recording) {
      return { error: "Recording not found" };
    }

    // Generate signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from("video-recordings")
      .createSignedUrl(recording.storage_path, 3600);

    if (urlError || !urlData) {
      console.error("Error generating signed URL:", urlError);
      return { error: "Failed to generate download URL" };
    }

    return { url: urlData.signedUrl };
  } catch (error) {
    console.error("getRecordingUrl server action error:", error);
    return { error: sanitizeError(error) };
  }
}


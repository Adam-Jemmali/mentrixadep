"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { validateUUID, sanitizeError } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { VideoRecording } from "@/lib/database.types";

/**
 * Saves a video recording to Supabase Storage and database.
 * Only tutors can create recordings for their sessions.
 * Accepts FormData with the recording file.
 */
export async function saveRecording(
  formData: FormData
): Promise<{ success: boolean; recording?: VideoRecording; error?: string }> {
  try {
    const user = await requireAuth();
    
    // Only tutors can record
    if (user.role !== "tutor") {
      return { success: false, error: "Only tutors can record sessions" };
    }

    // Extract data from FormData
    const sessionId = formData.get("sessionId") as string;
    const roomId = formData.get("roomId") as string;
    const file = formData.get("file") as File;
    const startedAt = formData.get("startedAt") as string;
    const endedAt = formData.get("endedAt") as string;
    const mimeType = formData.get("mimeType") as string;

    if (!sessionId || !roomId || !file || !startedAt || !endedAt) {
      return { success: false, error: "Missing required recording data" };
    }

    // SECURITY: Enforce file size limit (500MB max)
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
    if (file.size > MAX_FILE_SIZE) {
      return { 
        success: false, 
        error: `File too large. Maximum size is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.` 
      };
    }

    // SECURITY: Validate MIME type
    const allowedMimeTypes = ['video/webm', 'video/mp4', 'video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm;codecs=vp9,opus'];
    const fileMimeType = mimeType || file.type || '';
    if (fileMimeType && !allowedMimeTypes.some(allowed => fileMimeType.includes(allowed.split(';')[0] ?? allowed))) {
      return { 
        success: false, 
        error: `Invalid file type. Only video files (WebM, MP4) are allowed.` 
      };
    }

    // Correct MIME type if browser sent it incorrectly (e.g., text/plain)
    let correctedFile = file;
    const expectedMimeType = mimeType || 'video/webm';
    
    if (!file.type || file.type === 'text/plain' || !file.type.startsWith('video/')) {
      const fileBlob = await file.arrayBuffer();
      correctedFile = new File([fileBlob], file.name, {
        type: expectedMimeType,
        lastModified: file.lastModified || Date.now(),
      });
    }

    const supabase = await createClient();
    const validSessionId = validateUUID(sessionId);
    const validRoomId = validateUUID(roomId);

    // Verify session belongs to this tutor
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, tutor_id")
      .eq("id", validSessionId)
      .eq("tutor_id", user.id)
      .single();

    if (sessionError || !session) {
      return { success: false, error: "Session not found or unauthorized" };
    }

    // Verify room belongs to this session
    const { data: room, error: roomError } = await supabase
      .from("video_rooms")
      .select("id")
      .eq("id", validRoomId)
      .eq("session_id", validSessionId)
      .single();

    if (roomError || !room) {
      return { success: false, error: "Video room not found" };
    }

    // Calculate duration
    const durationSeconds = Math.floor(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
    );

    // Generate unique file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileExtension = correctedFile.name.split('.').pop() || expectedMimeType.split('/')[1]?.split(';')[0] || 'webm';
    const fileName = `recording-${validSessionId}-${timestamp}.${fileExtension}`;
    const storagePath = `recordings/${validSessionId}/${fileName}`;

    // Use the corrected file's type, or fallback to expected MIME type
    const contentType = correctedFile.type || expectedMimeType || "video/webm";
    
    // Upload to Supabase Storage (admin client for storage operations)
    const adminSupabase = createAdminClient();
    const { error: uploadError } = await adminSupabase.storage
      .from("video-recordings")
      .upload(storagePath, correctedFile, {
        contentType: contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading recording:", uploadError);
      const errorMessage = uploadError.message || uploadError.toString() || "Unknown upload error";
      
      // Check for common errors
      if (errorMessage.includes("Bucket not found") || errorMessage.includes("bucket")) {
        return { success: false, error: "Storage bucket 'video-recordings' not found. Please create it in Supabase Storage." };
      }
      if (errorMessage.includes("policy") || errorMessage.includes("permission")) {
        return { success: false, error: "Storage policy error. Please check RLS policies for the 'video-recordings' bucket." };
      }
      if (errorMessage.includes("size") || errorMessage.includes("limit")) {
        return { success: false, error: `File too large: ${(correctedFile.size / 1024 / 1024).toFixed(2)} MB. Check bucket size limits.` };
      }
      
      return { success: false, error: `Upload failed: ${errorMessage}` };
    }

    // Save recording metadata to database (admin client bypasses RLS; no INSERT policy on video_recordings)
    const { data: recording, error: dbError } = await adminSupabase
      .from("video_recordings")
      .insert({
        session_id: validSessionId,
        room_id: validRoomId,
        tutor_id: user.id,
        storage_path: storagePath,
        file_name: fileName,
        file_size: correctedFile.size,
        duration_seconds: durationSeconds,
        mime_type: contentType,
        started_at: startedAt,
        ended_at: endedAt,
      })
      .select()
      .single();

    if (dbError || !recording) {
      console.error("Error saving recording metadata:", dbError);
      // Try to delete uploaded file if database insert failed
      try {
        await adminSupabase.storage.from("video-recordings").remove([storagePath]);
      } catch (cleanupError) {
        console.error("Failed to cleanup uploaded file:", cleanupError);
      }
      
      const errorMessage = dbError?.message || dbError?.toString() || "Unknown database error";
      
      // Check for common database errors
      if (errorMessage.includes("violates") || errorMessage.includes("constraint")) {
        return { success: false, error: "Database constraint error. Please check that the video_recordings table exists and has correct schema." };
      }
      if (errorMessage.includes("policy") || errorMessage.includes("RLS")) {
        return { success: false, error: "Row Level Security policy error. Please check RLS policies for video_recordings table." };
      }
      
      return { success: false, error: `Database error: ${errorMessage}` };
    }

    revalidatePath(`/video/session/${validSessionId}`);
    revalidatePath("/dashboard");
    return { success: true, recording: recording as VideoRecording };
  } catch (error) {
    console.error("saveRecording server action error:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes("bucket") || errorMsg.includes("storage")) {
        return { success: false, error: "Storage bucket 'video-recordings' not found or not accessible. Please create it in Supabase Storage." };
      }
      if (errorMsg.includes("policy") || errorMsg.includes("permission") || errorMsg.includes("rls")) {
        return { success: false, error: "Permission denied. Please check storage and database RLS policies." };
      }
      if (errorMsg.includes("size") || errorMsg.includes("limit")) {
        return { success: false, error: "File size exceeds limit. Please check bucket size restrictions." };
      }
      
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


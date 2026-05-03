import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import {
  validateUUID,
  sanitizeError,
  sanitizeInput,
  validateUploadedFile,
} from "@/lib/security";
import { revalidatePath } from "next/cache";
import type { VideoRecording } from "@/lib/database.types";

/**
 * Persists a tutor session recording from multipart FormData (storage + DB).
 * Used by the Server Action and by `POST /api/recordings/upload` so large files
 * are not subject to the default Server Actions body limit.
 */
export async function saveSessionRecordingFromFormData(
  formData: FormData,
): Promise<{ success: boolean; recording?: VideoRecording; error?: string }> {
  try {
    const user = await requireAuth();

    if (user.role !== "tutor") {
      return { success: false, error: "Only tutors can record sessions" };
    }

    const sessionId = formData.get("sessionId") as string;
    const roomId = formData.get("roomId") as string;
    const file = formData.get("file") as File;
    const startedAt = formData.get("startedAt") as string;
    const endedAt = formData.get("endedAt") as string;
    const mimeType = formData.get("mimeType") as string;
    const recordingConsentConfirmed = formData.get("recordingConsentConfirmed");

    if (!sessionId || !roomId || !file || !startedAt || !endedAt) {
      return { success: false, error: "Missing required recording data" };
    }

    if (!(recordingConsentConfirmed === "true" || recordingConsentConfirmed === "1")) {
      return {
        success: false,
        error:
          "Recording consent required: both parties must explicitly agree before recording.",
      };
    }

    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
      };
    }

    const allowedMimeTypes = [
      "video/webm",
      "video/mp4",
      "video/webm;codecs=vp8",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp9,opus",
    ];
    const fileMimeType = sanitizeInput(mimeType || file.type || "", "recording mimeType");
    if (
      fileMimeType &&
      !allowedMimeTypes.some((allowed) => fileMimeType.includes(allowed.split(";")[0] ?? allowed))
    ) {
      return {
        success: false,
        error: `Invalid file type. Only video files (WebM, MP4) are allowed.`,
      };
    }

    let correctedFile = file;
    const expectedMimeType = mimeType || "video/webm";

    if (!file.type || file.type === "text/plain" || !file.type.startsWith("video/")) {
      const fileBlob = await file.arrayBuffer();
      correctedFile = new File([fileBlob], file.name, {
        type: expectedMimeType,
        lastModified: file.lastModified || Date.now(),
      });
    }

    const validated = await validateUploadedFile(correctedFile, {
      allowedMimeTypes: ["video/mp4", "video/webm"],
      maxBytes: MAX_FILE_SIZE,
    });
    if (!validated.ok) {
      return { success: false, error: validated.error };
    }

    const supabase = await createClient();
    const validSessionId = validateUUID(sessionId);
    const validRoomId = validateUUID(roomId);

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, tutor_id")
      .eq("id", validSessionId)
      .eq("tutor_id", user.id)
      .single();

    if (sessionError || !session) {
      return { success: false, error: "Session not found or unauthorized" };
    }

    const { data: room, error: roomError } = await supabase
      .from("video_rooms")
      .select("id")
      .eq("id", validRoomId)
      .eq("session_id", validSessionId)
      .single();

    if (roomError || !room) {
      return { success: false, error: "Video room not found" };
    }

    const durationSeconds = Math.floor(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileExtension =
      correctedFile.name.split(".").pop() ||
      expectedMimeType.split("/")[1]?.split(";")[0] ||
      "webm";
    const fileName = `recording-${validSessionId}-${timestamp}.${fileExtension}`;
    const storagePath = `recordings/${validSessionId}/${fileName}`;

    const contentType = correctedFile.type || expectedMimeType || "video/webm";

    const adminSupabase = createAdminClient();
    const { error: uploadError } = await adminSupabase.storage
      .from("video-recordings")
      .upload(storagePath, correctedFile, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading recording:", uploadError);
      const errorMessage = uploadError.message || uploadError.toString() || "Unknown upload error";

      if (errorMessage.includes("Bucket not found") || errorMessage.includes("bucket")) {
        return {
          success: false,
          error: "Storage bucket 'video-recordings' not found. Please create it in Supabase Storage.",
        };
      }
      if (errorMessage.includes("policy") || errorMessage.includes("permission")) {
        return {
          success: false,
          error: "Storage policy error. Please check RLS policies for the 'video-recordings' bucket.",
        };
      }
      if (errorMessage.includes("size") || errorMessage.includes("limit")) {
        return {
          success: false,
          error: `File too large: ${(correctedFile.size / 1024 / 1024).toFixed(2)} MB. Check bucket size limits.`,
        };
      }

      return { success: false, error: `Upload failed: ${errorMessage}` };
    }

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
        recording_consent_confirmed: true,
      })
      .select()
      .single();

    if (dbError || !recording) {
      console.error("Error saving recording metadata:", dbError);
      try {
        await adminSupabase.storage.from("video-recordings").remove([storagePath]);
      } catch (cleanupError) {
        console.error("Failed to cleanup uploaded file:", cleanupError);
      }

      const errorMessage = dbError?.message || dbError?.toString() || "Unknown database error";

      if (errorMessage.includes("violates") || errorMessage.includes("constraint")) {
        return {
          success: false,
          error:
            "Database constraint error. Please check that the video_recordings table exists and has correct schema.",
        };
      }
      if (errorMessage.includes("policy") || errorMessage.includes("RLS")) {
        return {
          success: false,
          error: "Row Level Security policy error. Please check RLS policies for video_recordings table.",
        };
      }

      return { success: false, error: `Database error: ${errorMessage}` };
    }

    revalidatePath(`/video/session/${validSessionId}`);
    revalidatePath("/dashboard");
    return { success: true, recording: recording as VideoRecording };
  } catch (error) {
    console.error("saveSessionRecordingFromFormData error:", error);

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();

      if (errorMsg.includes("bucket") || errorMsg.includes("storage")) {
        return {
          success: false,
          error: "Storage bucket 'video-recordings' not found or not accessible. Please create it in Supabase Storage.",
        };
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

"use server";

import { randomUUID } from "crypto";
import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  validateCourse,
  sanitizeCourseName,
  sanitizeError,
  enforceRateLimit,
  RATE_LIMITS,
  getRateLimitId,
  assertNoBlockedLanguage,
  validateUploadedFile,
  validateUUID,
} from "@/shared/core/security";

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
  evidenceUrl: string,
  onBehalfOfUserId?: string,
) {
  const user = await requireRole(["tutor", "admin"]);
  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client = user.role === "admin" ? createAdminClient() : await createClient();

  const validName = sanitizeCourseName(validateCourse(courseName));
  const validProof = proofDescription.trim().slice(0, 500);
  const validEvidence = evidenceUrl.trim();

  if (!validProof) throw new Error("Please describe your qualifications for this course");
  if (!validEvidence) throw new Error("Add a link to physical evidence (certificate, transcript, portfolio, or ID).");
  if (!/^https?:\/\//i.test(validEvidence)) {
    throw new Error("Evidence link must start with http:// or https://");
  }
  if (validEvidence.length > 500) throw new Error("Evidence link is too long.");
  assertNoBlockedLanguage(validProof, "proof of mastery");
  assertNoBlockedLanguage(validEvidence, "evidence link");

  const proofPayload = `${validProof}\nEvidence: ${validEvidence}`;

  const { error } = await client
    .from("tutor_courses")
    .insert({
      tutor_id: actingAsId,
      course_name: validName,
      proof_description: proofPayload,
      verified: true,
    });

  if (error) {
    if (error.code === "23505") throw new Error("You already added this course");
    throw new Error(`Failed to add course: ${sanitizeError(error)}`);
  }

  revalidatePath("/tutor");
  return { success: true };
}

function evidenceExtFromMime(mimeType: string): "pdf" | "jpg" | "png" {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

function pdfStructureLooksSafe(bytes: Buffer): boolean {
  if (bytes.length < 8) return false;
  const start = bytes.subarray(0, 5).toString("utf8");
  if (start !== "%PDF-") return false;
  const tail = bytes.subarray(Math.max(0, bytes.length - 2048)).toString("utf8");
  return tail.includes("%%EOF");
}

export async function uploadTutorCourseEvidence(
  formData: FormData,
  onBehalfOfUserId?: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const user = await requireRole(["tutor", "admin"]);
    if (user.role === "admin" && !onBehalfOfUserId) {
      return { success: false, error: "Invalid admin context for evidence upload." };
    }
    const actingAsId =
      user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;

    enforceRateLimit(
      getRateLimitId(user.id),
      RATE_LIMITS.createAvailability,
      "upload tutor evidence",
    );

    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return { success: false, error: "Choose a file to upload." };
    }

    const validation = await validateUploadedFile(file, {
      allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
      maxBytes: 8 * 1024 * 1024,
    });
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (validation.mimeType === "application/pdf" && !pdfStructureLooksSafe(bytes)) {
      return {
        success: false,
        error: "PDF appears corrupted or unsafe. Export a clean PDF and try again.",
      };
    }

    const ext = evidenceExtFromMime(validation.mimeType);
    const path = `${actingAsId}/${randomUUID()}.${ext}`;
    const admin = createAdminClient();
    const { error: uploadErr } = await admin.storage
      .from("tutor-evidence")
      .upload(path, bytes, {
        contentType: validation.mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadErr) {
      return {
        success: false,
        error:
          uploadErr.message.includes("Bucket") || uploadErr.message.includes("not found")
            ? "Tutor evidence storage is not configured yet."
            : `Evidence upload failed: ${uploadErr.message}`,
      };
    }

    const { data: pub } = admin.storage.from("tutor-evidence").getPublicUrl(path);
    return { success: true, url: pub.publicUrl };
  } catch (e) {
    return { success: false, error: sanitizeError(e) };
  }
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
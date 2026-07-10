"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  validateCourse,
  sanitizeCourseName,
  sanitizeError,
  assertNoBlockedLanguage,
  validateUUID,
} from "@/shared/core/security";
import {
  scanGuideProficiencyProof,
  type ProficiencyScanResult,
} from "@/features/tutor/guide-proficiency-scan-pure";

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
): Promise<
  | { success: true; verified: boolean; scan: ProficiencyScanResult }
  | { success: false; error: string; scan: ProficiencyScanResult }
> {
  const user = await requireRole(["tutor", "admin"]);
  const actingAsId = user.role === "admin" && onBehalfOfUserId ? onBehalfOfUserId : user.id;
  const client = user.role === "admin" ? createAdminClient() : await createClient();

  const validName = sanitizeCourseName(validateCourse(courseName));
  const validProof = proofDescription.trim().slice(0, 500);
  const validEvidence = evidenceUrl.trim();

  if (!validProof) throw new Error("Add a short mastery note for this course.");
  if (!validEvidence) throw new Error("Add an https link to a transcript, certificate, or portfolio.");
  if (!/^https?:\/\//i.test(validEvidence)) {
    throw new Error("Evidence link must start with http:// or https://");
  }
  if (validEvidence.length > 500) throw new Error("Evidence link is too long.");
  assertNoBlockedLanguage(validProof, "proof of mastery");
  assertNoBlockedLanguage(validEvidence, "evidence link");

  const scan = scanGuideProficiencyProof({
    proofDescription: validProof,
    evidenceUrl: validEvidence,
  });

  if (scan.verdict !== "verified") {
    return {
      success: false,
      error: scan.nextAction,
      scan,
    };
  }

  const proofPayload = `${validProof}\nEvidence: ${validEvidence}`;

  const { error } = await client.from("tutor_courses").insert({
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
  return { success: true, verified: true, scan };
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

"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { validateUUID, sanitizeError } from "@/shared/core/security";

export async function getAllUnverifiedTutorCourses() {
  await requireRole("admin");
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("tutor_courses")
    .select("*")
    .eq("verified", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch unverified courses: ${sanitizeError(error)}`);

  const tutorIds = Array.from(new Set((data ?? []).map((c) => c.tutor_id)));
  const emailMap: Record<string, string> = {};
  await Promise.all(
    tutorIds.map(async (tid) => {
      try {
        const { data: auth } = await adminClient.auth.admin.getUserById(tid);
        if (auth?.user?.email) emailMap[tid] = auth.user.email;
      } catch { /* best-effort */ }
    }),
  );

  return (data ?? []).map((c) => ({
    ...c,
    tutor_email: emailMap[c.tutor_id] ?? null,
  }));
}

export async function verifyTutorCourse(courseId: string) {
  await requireRole("admin");
  const adminClient = createAdminClient();
  const validId = validateUUID(courseId);

  const { error } = await adminClient
    .from("tutor_courses")
    .update({ verified: true })
    .eq("id", validId);

  if (error) throw new Error(`Failed to verify course: ${sanitizeError(error)}`);

  revalidatePath("/admin");
  return { success: true };
}

export async function unverifyTutorCourse(courseId: string) {
  await requireRole("admin");
  const adminClient = createAdminClient();
  const validId = validateUUID(courseId);

  const { error } = await adminClient
    .from("tutor_courses")
    .update({ verified: false })
    .eq("id", validId);

  if (error) throw new Error(`Failed to unverify course: ${sanitizeError(error)}`);

  revalidatePath("/admin");
  return { success: true };
}

export async function getTutorCoursesForAdmin(tutorId: string) {
  await requireRole("admin");
  const adminClient = createAdminClient();
  const validId = validateUUID(tutorId);

  const { data, error } = await adminClient
    .from("tutor_courses")
    .select("*")
    .eq("tutor_id", validId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch tutor courses: ${sanitizeError(error)}`);
  return data ?? [];
}

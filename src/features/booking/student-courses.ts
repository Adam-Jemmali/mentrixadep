"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { validateCourse, sanitizeCourseName, validateUUID, sanitizeError } from "@/shared/core/security";
import { revalidatePath } from "next/cache";
import { isMissingStudentCoursesRelation } from "@/features/booking/booking-internal";

export async function getStudentCourses() {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_courses")
    .select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingStudentCoursesRelation(error)) return [];
    const msg = "message" in error && typeof (error as { message?: string }).message === "string"
      ? (error as { message: string }).message
      : sanitizeError(error);
    throw new Error(`Failed to fetch student courses: ${msg}`);
  }
  return data ?? [];
}

export async function addStudentCourse(courseName: string) {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const validName = sanitizeCourseName(validateCourse(courseName));

  const { error } = await supabase
    .from("student_courses")
    .insert({ student_id: user.id, course_name: validName });

  if (error) {
    if (error.code === "23505") throw new Error("You already added this course");
    throw new Error(`Failed to add course: ${sanitizeError(error)}`);
  }

  revalidatePath("/student");
  return { success: true };
}

export async function removeStudentCourse(courseId: string) {
  const user = await requireRole(["student", "admin"]);
  const supabase = await createClient();

  const validId = validateUUID(courseId);

  const { error } = await supabase
    .from("student_courses")
    .delete()
    .eq("id", validId)
    .eq("student_id", user.id);

  if (error) throw new Error(`Failed to remove course: ${sanitizeError(error)}`);

  revalidatePath("/student");
  return { success: true };
}

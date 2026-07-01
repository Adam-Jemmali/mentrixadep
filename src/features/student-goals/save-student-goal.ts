"use server";

import { requireRole } from "@/shared/core/auth";
import { createClient } from "@/shared/integrations/supabase/server";
import { revalidatePath } from "next/cache";
import {
  saveStudentGoalSchema,
  type SaveStudentGoalInput,
} from "@/features/student-goals/types";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";

export async function saveStudentGoal(
  input: SaveStudentGoalInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole(["student", "admin"]);
  const parsed = saveStudentGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid goal." };
  }

  const payload = parsed.data;
  const subject = payload.subject.trim() || AP_CALC_AB_SUBJECT;
  const supabase = await createClient();

  await supabase
    .from("student_goals")
    .update({ active: false })
    .eq("user_id", user.id)
    .eq("subject", subject)
    .eq("active", true);

  const insertRow =
    payload.goalType === "exam_date"
      ? {
          user_id: user.id,
          subject,
          goal_type: payload.goalType,
          target_date: payload.targetDate,
          target_percentile: null,
          active: true,
        }
      : payload.goalType === "percentile_target"
        ? {
            user_id: user.id,
            subject,
            goal_type: payload.goalType,
            target_date: null,
            target_percentile: payload.targetPercentile,
            active: true,
          }
        : {
            user_id: user.id,
            subject,
            goal_type: payload.goalType,
            target_date: null,
            target_percentile: null,
            active: true,
          };

  const { error } = await supabase.from("student_goals").insert(insertRow);
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/student");
  return { success: true };
}

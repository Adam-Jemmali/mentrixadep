"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { AP_CALC_AB_SUBJECT, isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import type { StudentGoal, StudentGoalType } from "@/features/student-goals/types";

type GoalRow = {
  id: string;
  user_id: string;
  subject: string;
  goal_type: string;
  target_date: string | null;
  target_percentile: number | null;
  created_at: string;
  active: boolean;
};

function mapGoalRow(row: GoalRow): StudentGoal {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    subject: String(row.subject),
    goalType: row.goal_type as StudentGoalType,
    targetDate: row.target_date,
    targetPercentile:
      row.target_percentile == null ? null : Number(row.target_percentile),
    createdAt: String(row.created_at),
    active: row.active === true,
  };
}

export async function loadActiveStudentGoal(
  userId: string,
  subject = AP_CALC_AB_SUBJECT,
): Promise<StudentGoal | null> {
  if (!isApCalculusAbSubject(subject)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("student_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("subject", subject)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;
  return mapGoalRow(data as GoalRow);
}

export async function loadActiveStudentGoalForViewer(
  subject = AP_CALC_AB_SUBJECT,
): Promise<StudentGoal | null> {
  const user = await requireRole(["student", "admin"]);
  return loadActiveStudentGoal(user.id, subject);
}

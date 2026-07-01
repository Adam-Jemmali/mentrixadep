import { z } from "zod";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";

export const STUDENT_GOAL_TYPES = [
  "exam_date",
  "percentile_target",
  "pace_target",
] as const;

export type StudentGoalType = (typeof STUDENT_GOAL_TYPES)[number];

export type StudentGoal = {
  id: string;
  userId: string;
  subject: string;
  goalType: StudentGoalType;
  targetDate: string | null;
  targetPercentile: number | null;
  createdAt: string;
  active: boolean;
};

export const saveStudentGoalSchema = z.discriminatedUnion("goalType", [
  z.object({
    goalType: z.literal("exam_date"),
    subject: z.string().min(1).max(120).default(AP_CALC_AB_SUBJECT),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    goalType: z.literal("percentile_target"),
    subject: z.string().min(1).max(120).default(AP_CALC_AB_SUBJECT),
    targetPercentile: z.number().int().min(1).max(99),
  }),
  z.object({
    goalType: z.literal("pace_target"),
    subject: z.string().min(1).max(120).default(AP_CALC_AB_SUBJECT),
  }),
]);

export type SaveStudentGoalInput = z.infer<typeof saveStudentGoalSchema>;

export const GOAL_CAPTURE_DISMISS_KEY = "mentrixa-goal-capture-dismiss-v1";

export const EXAM_URGENCY_DAYS = 14;
export const VERIFIED_NODE_SUCCESS_THRESHOLD = 70;

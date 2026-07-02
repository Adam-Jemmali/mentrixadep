import { z } from "zod";

export const movementReceiptGridSchema = z.object({
  newlyVerifiedCount: z.number().int().min(0),
  flippedToWeakCount: z.number().int().min(0),
  verifiedTotalCount: z.number().int().min(0),
  priorWeekNewlyVerified: z.number().int().min(0),
});

export const movementReceiptLoopSchema = z.object({
  completedThisWeek: z.number().int().min(0),
  latestClosedNodeName: z.string().nullable(),
  latestPreAccuracy: z.number().nullable(),
  latestPostAccuracy: z.number().nullable(),
});

export const movementReceiptRetestSchema = z.object({
  nodeName: z.string().nullable(),
  isDue: z.boolean(),
  countdownLabel: z.string().nullable(),
  priorityRetest: z.boolean(),
});

export const movementReceiptCreditSchema = z.object({
  momentumActive: z.boolean(),
  creditsRemaining: z.number().int().min(0),
  periodMonth: z.string().nullable(),
});

export const movementReceiptPeerSchema = z.object({
  userVerifiedThisWeek: z.number().int().min(0),
  cohortMedian: z.number().min(0),
  sampleSize: z.number().int().min(0),
});

export const movementReceiptDataSchema = z.object({
  firstName: z.string(),
  weekStart: z.string(),
  momentumActive: z.boolean(),
  grid: movementReceiptGridSchema,
  loops: movementReceiptLoopSchema,
  retest: movementReceiptRetestSchema,
  credit: movementReceiptCreditSchema,
  peer: movementReceiptPeerSchema.nullable().optional(),
});

export type MovementReceiptData = z.infer<typeof movementReceiptDataSchema>;

export type MovementReceiptRow = {
  id: string;
  student_id: string;
  week_start: string;
  receipt_data: MovementReceiptData;
  generated_at: string;
  email_sent_at: string | null;
  clicked_at: string | null;
};

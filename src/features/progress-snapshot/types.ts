import { z } from "zod";

export const progressSnapshotRankSchema = z.object({
  level: z.number().int().min(1).max(7),
  title: z.string(),
});

export const progressSnapshotGuideSchema = z.object({
  tutorId: z.string().uuid(),
  displayName: z.string(),
  impactScore: z.number(),
  /** Subject the outcome-based impact score applies to (e.g. weakest concept area). */
  impactSubject: z.string(),
  bookingUrl: z.string().url(),
});

export const progressSnapshotDataSchema = z.object({
  firstName: z.string(),
  subject: z.string(),
  divisionKey: z.string(),
  rankChange: z.object({
    direction: z.enum(["up", "down", "same"]),
    previous: progressSnapshotRankSchema,
    current: progressSnapshotRankSchema,
  }),
  accuracyThisWeek: z.number().int().min(0).max(100),
  accuracyDelta: z.number().int(),
  duelsWon: z.number().int().min(0),
  duelsLost: z.number().int().min(0),
  divisionRank: z.object({
    current: z.number().int().min(1),
    previous: z.number().int().min(1),
    delta: z.number().int(),
  }),
  weakestConcept: z.object({
    label: z.string(),
    accuracyPercent: z.number().int().min(0).max(100),
  }),
  predictedNextRank: z.object({
    title: z.string(),
    xpNeeded: z.number().int().min(0),
    daysAtCurrentPace: z.number().int().min(1).nullable(),
  }),
  recommendedGuide: progressSnapshotGuideSchema,
  bookingCtaUrl: z.string().url(),
});

export type ProgressSnapshotData = z.infer<typeof progressSnapshotDataSchema>;

export type ProgressSnapshotRow = {
  id: string;
  student_id: string;
  snapshot_data: ProgressSnapshotData;
  generated_at: string;
  email_sent_at: string | null;
  clicked_at: string | null;
};

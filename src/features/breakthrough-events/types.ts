import { z } from "zod";

export const breakthroughCelebrationSchema = z.object({
  eventId: z.string().uuid(),
  subject: z.string(),
  concept: z.string(),
  accuracyBefore: z.number(),
  accuracyAfter: z.number(),
  nextConcept: z.string().nullable(),
  shareUrl: z.string(),
  ogImageUrl: z.string(),
});

export type BreakthroughCelebration = z.infer<typeof breakthroughCelebrationSchema>;

export const BREAKTHROUGH_MIN_JUMP = 25;
export const BREAKTHROUGH_OLD_MAX_AVG = 70;
export const BREAKTHROUGH_RECENT_QUESTS = 5;
export const BREAKTHROUGH_OLD_QUESTS = 5;
export const BREAKTHROUGH_OLD_MIN_DAYS = 14;

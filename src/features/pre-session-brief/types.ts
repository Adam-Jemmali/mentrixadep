import { z } from "zod";

export const preSessionWeakestConceptSchema = z.object({
  label: z.string(),
  accuracyPercent: z.number().int().min(0).max(100),
});

export const preSessionPerformanceSchema = z.object({
  questAccuracyLast30Days: z.number().int().min(0).max(100),
  questAccuracyTrendDelta: z.number().int(),
  weakestConcepts: z.array(preSessionWeakestConceptSchema).max(3),
  duelWins: z.number().int().min(0),
  duelLosses: z.number().int().min(0),
  currentRankTitle: z.string(),
  currentRankLevel: z.number().int().min(1),
  divisionPosition: z.number().int().min(1).nullable(),
  divisionKey: z.string().nullable(),
  lastSessionTopic: z.string().nullable(),
});

export const preSessionAiBriefSchema = z.object({
  likelyCoverage: z.array(z.string()),
  weakSpotsToWatch: z.array(z.string()),
  warmUpExercise: z.object({
    title: z.string(),
    prompt: z.string(),
    hint: z.string().optional(),
  }),
  questionsToAsk: z.array(z.string()),
});

export const preSessionBreakthroughSchema = z.object({
  conceptLabel: z.string(),
  currentRankTitle: z.string(),
  nextRankTitle: z.string(),
  message: z.string(),
});

export const preSessionContextSchema = z.object({
  sessionId: z.string().uuid(),
  subject: z.string(),
  sessionStartTime: z.string(),
  studentDisplayName: z.string(),
  performance: preSessionPerformanceSchema,
  aiBrief: preSessionAiBriefSchema.nullable(),
  breakthrough: preSessionBreakthroughSchema.nullable(),
  cachedAt: z.string(),
});

export type PreSessionContext = z.infer<typeof preSessionContextSchema>;

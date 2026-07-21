import { z } from "zod";
import { masteryGridDataSchema } from "@/features/mastery-grid/schema";

export const preSessionVerifiedGapNodeSchema = z.object({
  unitName: z.string(),
  nodeName: z.string(),
  verifiedFirstAttempt: z.boolean().nullable(),
  attemptsCount: z.number().int().min(0),
  correctCount: z.number().int().min(0),
});

export const preSessionVerifiedGapsSchema = z.object({
  nodes: z.array(preSessionVerifiedGapNodeSchema).max(3),
});

export type VerifiedGapsSummary = z.infer<typeof preSessionVerifiedGapsSchema>;

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

export const apReadinessBandViewSchema = z.object({
  score: z.number().nullable(),
  label: z.string(),
  sublabel: z.string(),
  isVerifiedPrediction: z.boolean(),
});

export const guideSessionIntelligenceSchema = z.object({
  strongestNodeName: z.string(),
  gapNodeName: z.string(),
  lastGuideSessionLabel: z.string(),
  focusSignalDisplay: z.string(),
});

export const guideWarmupItemSchema = z.object({
  nodeName: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).max(8).optional(),
});

export const preSessionContextSchema = z.object({
  sessionId: z.string().uuid(),
  subject: z.string(),
  sessionStartTime: z.string(),
  studentDisplayName: z.string(),
  performance: preSessionPerformanceSchema,
  aiBrief: preSessionAiBriefSchema.nullable(),
  breakthrough: preSessionBreakthroughSchema.nullable(),
  verifiedGaps: preSessionVerifiedGapsSchema.nullable().optional(),
  sessionTargetNodeIds: z.array(z.string().uuid()).optional(),
  masteryGrid: masteryGridDataSchema.nullable().optional(),
  readinessBand: apReadinessBandViewSchema.optional(),
  workingTowardLine: z.string().optional(),
  sessionIntelligence: guideSessionIntelligenceSchema.optional(),
  warmupItem: guideWarmupItemSchema.nullable().optional(),
  cachedAt: z.string(),
});

export type PreSessionContext = z.infer<typeof preSessionContextSchema>;

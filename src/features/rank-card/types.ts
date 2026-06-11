import { z } from "zod";

export const rankCardBreakthroughSchema = z.object({
  date: z.string(),
  concept: z.string(),
  prePercent: z.number().int().min(0).max(100),
  postPercent: z.number().int().min(0).max(100),
});

export const rankCardSubjectSchema = z.object({
  subject: z.string(),
  rankTitle: z.string(),
  rankLevel: z.number().int().min(1),
  accuracyTrend: z.array(
    z.object({
      date: z.string(),
      accuracy: z.number().int().min(0).max(100),
    }),
  ),
  currentAccuracy: z.number().int().min(0).max(100),
  duelWinRate: z.number().int().min(0).max(100),
  peerDuelWinRate: z.number().int().min(0).max(100).nullable(),
  guideSessionsCompleted: z.number().int().min(0),
  breakthroughs: z.array(rankCardBreakthroughSchema),
  lastActivityAt: z.string().nullable(),
  questCount: z.number().int().min(0),
});

export const rankCardDataSchema = z.object({
  username: z.string(),
  displayName: z.string(),
  globalRankTitle: z.string(),
  globalRankLevel: z.number().int().min(1),
  totalXp: z.number().int().min(0),
  subjects: z.array(rankCardSubjectSchema),
  topSubject: rankCardSubjectSchema.nullable(),
  warBadges: z.array(
    z.object({
      divisionName: z.string(),
      expiresAt: z.string(),
    }),
  ),
  isPrivate: z.literal(false),
});

export const rankCardPrivateSchema = z.object({
  username: z.string(),
  isPrivate: z.literal(true),
});

export type RankCardData = z.infer<typeof rankCardDataSchema>;
export type RankCardSubject = z.infer<typeof rankCardSubjectSchema>;
export type RankCardBreakthrough = z.infer<typeof rankCardBreakthroughSchema>;
export type RankCardResult = RankCardData | z.infer<typeof rankCardPrivateSchema> | null;

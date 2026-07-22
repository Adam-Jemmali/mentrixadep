import { z } from "zod";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import { masteryGridDataSchema } from "@/features/mastery-grid/schema";

export const rankCardBreakthroughSchema = z.object({
  date: z.string(),
  concept: z.string(),
  prePercent: z.number().int().min(0).max(100),
  postPercent: z.number().int().min(0).max(100),
});

export const rankPassportReceiptSchema = z.object({
  nodeName: z.string(),
  beforeState: z.string(),
  afterState: z.string(),
  date: z.string(),
  prePercent: z.number().int().min(0).max(100).optional(),
  postPercent: z.number().int().min(0).max(100).optional(),
});

export const passportVerdictSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ranked"), topPercent: z.number().int().min(1).max(100) }),
  z.object({
    kind: z.literal("accumulating"),
    verifiedCount: z.number().int().min(1),
    remaining: z.number().int().min(0),
  }),
  z.object({ kind: z.literal("empty") }),
]);

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
  verifiedFirstAttemptSummary: z.string().nullable().optional(),
});

export const rankPassportIdentitySchema = z.object({
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  timezone: z.string(),
  memberSince: z.string(),
  sex: z.enum(["feminine", "masculine"]).nullable(),
  signature: z.string().nullable(),
  role: z.enum(["student", "tutor"]),
});

export const rankPassportDivisionSchema = z.object({
  status: z.enum(["no_division", "rank_1", "has_rival"]),
  divisionName: z.string(),
  myRank: z.number().int().nullable(),
  myXp: z.number().int().min(0),
});

export const rankCardDataSchema = z.object({
  userId: z.string().uuid(),
  username: z.string(),
  displayName: z.string(),
  globalRankTitle: z.string(),
  globalRankLevel: z.number().int().min(1),
  rankTitle: z.string(),
  rankLevel: z.number().int().min(1),
  totalXp: z.number().int().min(0),
  verifiedPercentile: z.number().nullable(),
  verifiedSkillCount: z.number().int().min(0),
  verifiedAccuracyPercent: z.number().int().min(0).max(100),
  passportVerdict: passportVerdictSchema,
  breakthroughReceipts: z.array(rankPassportReceiptSchema).max(3),
  subjects: z.array(rankCardSubjectSchema),
  topSubject: rankCardSubjectSchema.nullable(),
  warBadges: z.array(
    z.object({
      divisionName: z.string(),
      expiresAt: z.string(),
    }),
  ),
  masteryGrid: masteryGridDataSchema.nullable().optional(),
  rankDeltaVerdict: z.custom<Verdict>().nullable().optional(),
  vfaStreakDays: z.number().int().min(0).optional(),
  vfaStreakLongest: z.number().int().min(0).optional(),
  passportDivision: rankPassportDivisionSchema,
  identity: rankPassportIdentitySchema,
  isPrivate: z.literal(false),
});

export const rankCardPrivateSchema = z.object({
  username: z.string(),
  isPrivate: z.literal(true),
});

export type RankPassportIdentity = z.infer<typeof rankPassportIdentitySchema>;
export type PassportDivisionSnapshot = z.infer<typeof rankPassportDivisionSchema>;

export type RankCardData = z.infer<typeof rankCardDataSchema>;
export type RankCardSubject = z.infer<typeof rankCardSubjectSchema>;
export type RankCardBreakthrough = z.infer<typeof rankCardBreakthroughSchema>;
export type RankPassportReceipt = z.infer<typeof rankPassportReceiptSchema>;
export type PassportVerdict = z.infer<typeof passportVerdictSchema>;
export type RankCardResult = RankCardData | z.infer<typeof rankCardPrivateSchema> | null;

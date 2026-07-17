import { z } from "zod";

export const masteryNodeStateSchema = z.enum(["none", "weak", "proficient", "verified"]);

export const masteryGridNodeSchema = z.object({
  id: z.string().uuid(),
  nodeName: z.string(),
  nodeSlug: z.string(),
  displayOrder: z.number().int(),
  state: masteryNodeStateSchema,
  accuracyPercent: z.number().int().min(0).max(100).nullable(),
  practiceAttempts: z.number().int().min(0).default(0),
  practiceCorrect: z.number().int().min(0).default(0),
  hasVerifiedAttempt: z.boolean().default(false),
  verifiedCorrect: z.boolean().nullable().default(null),
  peerBetterThanPercent: z.number().min(0).max(100).nullable().default(null),
});

export const masteryGridUnitSchema = z.object({
  unitNumber: z.number().int().min(1),
  unitName: z.string(),
  nodes: z.array(masteryGridNodeSchema),
});

export const masteryGridGlobalRankSchema = z.object({
  accuracyPercent: z.number().min(0).max(100),
  verifiedCount: z.number().int().min(0),
  topPercent: z.number().int().min(1).max(100).nullable(),
});

export const masteryGridDataSchema = z.object({
  subject: z.string(),
  units: z.array(masteryGridUnitSchema),
  globalRank: masteryGridGlobalRankSchema.optional(),
  nextActionLine: z.string(),
});

import { z } from "zod";

export const divisionWarContributorSchema = z.object({
  studentId: z.string().uuid(),
  displayName: z.string(),
  accuracyPoints: z.number(),
  questsCompleted: z.number().int().min(0),
});

export const divisionWarSideSchema = z.object({
  divisionId: z.string().uuid(),
  divisionKey: z.string(),
  divisionName: z.string(),
  totalAccuracyPoints: z.number(),
  topContributors: z.array(divisionWarContributorSchema),
});

export const divisionWarPanelSchema = z.object({
  warId: z.string().uuid(),
  subject: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
  status: z.enum(["active", "completed"]),
  sideA: divisionWarSideSchema,
  sideB: divisionWarSideSchema,
  mySide: z.enum(["a", "b"]).nullable(),
  winnerDivisionId: z.string().uuid().nullable(),
});

export const divisionWarPanelPayloadSchema = z.object({
  war: divisionWarPanelSchema.nullable(),
  myContribution: z
    .object({
      accuracyPoints: z.number(),
      questsCompleted: z.number().int(),
    })
    .nullable(),
  showInactiveBanner: z.boolean(),
});

export type DivisionWarContributor = z.infer<typeof divisionWarContributorSchema>;
export type DivisionWarSide = z.infer<typeof divisionWarSideSchema>;
export type DivisionWarPanel = z.infer<typeof divisionWarPanelSchema>;
export type DivisionWarPanelPayload = z.infer<typeof divisionWarPanelPayloadSchema>;

export type DivisionWarBadge = {
  divisionName: string;
  expiresAt: string;
};

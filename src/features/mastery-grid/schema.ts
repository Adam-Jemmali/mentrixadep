import { z } from "zod";

export const masteryNodeStateSchema = z.enum(["none", "weak", "proficient", "verified"]);

export const masteryGridNodeSchema = z.object({
  id: z.string().uuid(),
  nodeName: z.string(),
  nodeSlug: z.string(),
  displayOrder: z.number().int(),
  state: masteryNodeStateSchema,
  accuracyPercent: z.number().int().min(0).max(100).nullable(),
});

export const masteryGridUnitSchema = z.object({
  unitNumber: z.number().int().min(1),
  unitName: z.string(),
  nodes: z.array(masteryGridNodeSchema),
});

export const masteryGridDataSchema = z.object({
  subject: z.string(),
  units: z.array(masteryGridUnitSchema),
  nextActionLine: z.string(),
});

import { z } from "zod";
import type { QuestGoal, QuestMode } from "@/features/quest/quest-internal";
import type { AdaptiveWorldState } from "@/shared/integrations/ai/adaptive-quest";

export type AdaptiveClassicMetadata = {
  goal: QuestGoal;
  mode: QuestMode;
  subject: string;
  adaptiveChallenge: true;
  worldState: AdaptiveWorldState | null;
  feedbackHistory: string[];
  initialPrompt: string;
};

export const adaptiveTurnRequestSchema = z.object({
  questId: z.string().uuid(),
  message: z.string().min(1).max(5000),
  priorWorldState: z
    .object({
      scenarioTitle: z.string().min(1).max(400),
      scenarioPrinciple: z.string().min(1).max(600).optional(),
      stepIndex: z.number().int().min(1).max(5),
      stepTotal: z.number().int().min(1).max(5),
      scenarioHealth: z.number().min(0).max(100),
      currentChallenge: z.string().min(1).max(1200),
      difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]),
    })
    .nullable(),
  subject: z.string().min(1).max(120),
});

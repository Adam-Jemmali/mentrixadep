import { z } from "zod";

/** One step in a traced solution path from item_bank.step_sequence. */
export const stepTraceStepSchema = z.object({
  step_number: z.number().int().positive(),
  prompt: z.string().min(4).max(4000),
  options: z.array(z.string().min(1).max(500)).min(2).max(6),
  correct_option_index: z.number().int().min(0),
  misconception_tag_per_wrong_option: z.record(z.string(), z.string().max(500)),
});

export const stepTraceSequenceSchema = z
  .array(stepTraceStepSchema)
  .min(2)
  .max(12)
  .superRefine((steps, ctx) => {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      if (step.step_number !== i + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `step_number must be sequential starting at 1 (got ${step.step_number} at index ${i})`,
        });
      }
      if (step.correct_option_index >= step.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `correct_option_index out of range on step ${step.step_number}`,
        });
      }
    }
  });

export type StepTraceStep = z.infer<typeof stepTraceStepSchema>;
export type StepTraceSequence = z.infer<typeof stepTraceSequenceSchema>;

export type StepTraceProblem = {
  itemId: string;
  prompt: string;
  stepSequence: StepTraceSequence;
  skillNodeId?: string;
  nodeName?: string;
  examStakes?: string;
};

export type StepTraceStepResult = {
  step_number: number;
  /** Option indices the user selected, in order. */
  picks: number[];
  misconception_tags: string[];
  /** User reached the correct move without a forced reveal. */
  resolved_correctly: boolean;
  /** Correct path was shown after a failed retry. */
  required_reveal: boolean;
};

/** Full traced attempt passed to diagnosticVerdict (prompt 011). */
export type StepTraceCompletion = {
  itemId: string;
  skillNodeId?: string;
  steps: StepTraceStepResult[];
  misconception_tags: string[];
  steps_correct_first_try: number;
  total_steps: number;
};

export function parseStepTraceSequence(raw: unknown): StepTraceSequence | null {
  const parsed = stepTraceSequenceSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function misconceptionTagForPick(
  step: StepTraceStep,
  optionIndex: number,
): string | null {
  if (optionIndex === step.correct_option_index) return null;
  const optionText = step.options[optionIndex];
  if (!optionText) return null;
  const byText = step.misconception_tag_per_wrong_option[optionText];
  if (byText?.trim()) return byText.trim();
  const byIndex = step.misconception_tag_per_wrong_option[String(optionIndex)];
  if (byIndex?.trim()) return byIndex.trim();
  return null;
}

export function buildStepTraceCompletion(
  problem: StepTraceProblem,
  stepResults: StepTraceStepResult[],
): StepTraceCompletion {
  const allTags: string[] = [];
  for (const step of stepResults) {
    for (const tag of step.misconception_tags) {
      if (tag && !allTags.includes(tag)) allTags.push(tag);
    }
  }
  return {
    itemId: problem.itemId,
    skillNodeId: problem.skillNodeId,
    steps: stepResults,
    misconception_tags: allTags,
    steps_correct_first_try: stepResults.filter((s) => s.resolved_correctly).length,
    total_steps: problem.stepSequence.length,
  };
}

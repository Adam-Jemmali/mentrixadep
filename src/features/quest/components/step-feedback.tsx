"use client";

import { useMemo } from "react";
import { Button } from "@/shared/ui/button";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import {
  MentrixaAccordion,
  MentrixaAccordionItem,
} from "@/shared/ui/accordion-patterns";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { VerdictPanel } from "@/features/guidance/verdict-panel";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import {
  diffExpressionParts,
  findDivergeStepIndex,
  hasStepFeedbackTrace,
  stepFeedbackNextAction,
  stepFeedbackVerdict,
  type PartialCreditRule,
  type SolutionStep,
  type StepFeedbackOutcome,
  type StepFeedbackPartial,
} from "@/features/quest/components/step-feedback-pure";
import { cn } from "@/shared/core/utils";

const VIOLET = "#7C3AED";

function stepVerdict(
  outcome: StepFeedbackOutcome,
  reason: string,
): Verdict {
  return {
    changed: stepFeedbackVerdict(outcome),
    reason,
    nextAction: { label: stepFeedbackNextAction(outcome), href: "#" },
  };
}

type Props = {
  outcome: StepFeedbackOutcome;
  studentAnswer?: string;
  correctAnswer?: string;
  solutionSteps?: SolutionStep[];
  partialCredit?: StepFeedbackPartial | null;
  fallbackExplanation?: string;
  onContinue?: () => void;
  continueLabel?: string;
  busy?: boolean;
  className?: string;
  surface?: "light" | "dark";
};

function ExpressionColumn({
  label,
  parts,
  surface,
}: {
  label: string;
  parts: Array<{ text: string; highlight: boolean }>;
  surface: "light" | "dark";
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#E0E7FF] bg-white/80 p-3 dark:border-white/10 dark:bg-[#0F172A]/60">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6366F1]">{label}</p>
      <div
        className={cn(
          "mt-2 flex flex-wrap items-baseline gap-x-1 gap-y-1 text-sm leading-relaxed",
          surface === "dark" ? "text-white" : "text-[#0B1220]",
        )}
      >
        {parts.map((part, index) => (
          <span
            key={`${part.text}-${index}`}
            className={cn(
              part.highlight && "border-b-2 border-red-500 pb-0.5",
              "[&_.katex]:text-inherit",
            )}
          >
            <PromptWithMath text={part.text} variant={surface} />
          </span>
        ))}
      </div>
    </div>
  );
}

function SolutionPathSteps({
  steps,
  divergeIndex,
  surface,
}: {
  steps: SolutionStep[];
  divergeIndex?: number;
  surface: "light" | "dark";
}) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const isDiverge = divergeIndex === index;
        return (
          <li
            key={`${step.step_number}-${index}`}
            className={cn(
              "rounded-xl border px-3 py-3",
              isDiverge
                ? "border-[#7C3AED]/50 bg-[#F5F3FF]"
                : "border-[#E0E7FF] bg-white/70",
            )}
            style={isDiverge ? { borderLeftWidth: 4, borderLeftColor: VIOLET } : undefined}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[11px] font-bold text-[#7C3AED]">
                {step.step_number}
              </span>
              <div className="min-w-0 flex-1">
                {isDiverge ? (
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C3AED]">
                    This is where your reasoning broke.
                  </p>
                ) : null}
                <p
                  className={cn(
                    "text-sm leading-snug",
                    surface === "dark" ? "text-white" : "text-[#0B1220]",
                  )}
                >
                  {step.description}
                </p>
                {step.expression ? (
                  <div className="mt-2 text-sm">
                    <PromptWithMath text={step.expression} variant={surface} />
                  </div>
                ) : null}
                {isDiverge && step.misconception_if_skipped ? (
                  <p
                    className={cn(
                      "mt-2 text-sm leading-relaxed",
                      surface === "dark" ? "text-slate-300" : "text-[#475569]",
                    )}
                  >
                    {step.misconception_if_skipped}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function StepFeedback({
  outcome,
  studentAnswer = "",
  correctAnswer = "",
  solutionSteps = [],
  partialCredit = null,
  fallbackExplanation,
  onContinue,
  continueLabel = "Next question",
  busy = false,
  className,
  surface = "light",
}: Props) {
  const steps = solutionSteps;
  const hasTrace = hasStepFeedbackTrace(steps);
  const divergeIndex = useMemo(
    () => findDivergeStepIndex(steps, studentAnswer, correctAnswer),
    [steps, studentAnswer, correctAnswer],
  );
  const diff = useMemo(
    () => diffExpressionParts(studentAnswer, correctAnswer),
    [studentAnswer, correctAnswer],
  );

  if (!hasTrace && fallbackExplanation) {
    return (
      <div className={cn("space-y-3", className)}>
        <VerdictPanel
          verdict={stepVerdict(outcome, fallbackExplanation)}
          tone={surface}
          showNextAction={false}
        />
        <div className="text-sm leading-relaxed">
          <PromptWithMath text={fallbackExplanation} variant={surface} />
        </div>
        {onContinue ? (
          <Button type="button" onClick={onContinue} disabled={busy}>
            {continueLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  if (!hasTrace) return null;

  if (outcome === "correct") {
    return (
      <div className={cn("space-y-3", className)}>
        <MentrixaAccordion tone={surface} variant="surface" className="space-y-0">
          <MentrixaAccordionItem
            id="solution-path"
            title="See the full solution path"
            leadingIcon={<MentrixaVocabIcon name="verified" size={18} gold surface={surface} />}
            verdict={stepFeedbackVerdict("correct")}
            nextAction={stepFeedbackNextAction("correct")}
          >
            <SolutionPathSteps steps={steps} surface={surface} />
          </MentrixaAccordionItem>
        </MentrixaAccordion>
        {onContinue ? (
          <Button type="button" onClick={onContinue} disabled={busy}>
            {continueLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  if (outcome === "partial" && partialCredit) {
    return (
      <div className={cn("space-y-4", className)}>
        <VerdictPanel
          verdict={{
            changed: `Partial credit: ${partialCredit.label}`,
            reason: partialCredit.rightSummary,
            nextAction: { label: partialCredit.missingSummary, href: "#" },
          }}
          tone={surface}
          showNextAction={false}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <ExpressionColumn label="Your answer" parts={diff.studentParts} surface={surface} />
          <ExpressionColumn label="Full answer" parts={diff.correctParts} surface={surface} />
        </div>
        <SolutionPathSteps steps={steps} divergeIndex={divergeIndex} surface={surface} />
        {onContinue ? (
          <Button type="button" onClick={onContinue} disabled={busy}>
            {continueLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <VerdictPanel
        verdict={stepVerdict(
          "incorrect",
          steps[divergeIndex]?.misconception_if_skipped ||
            "Compare your line to the verified path below.",
        )}
        tone={surface}
        showNextAction={false}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ExpressionColumn label="Your answer" parts={diff.studentParts} surface={surface} />
        <ExpressionColumn label="Correct answer" parts={diff.correctParts} surface={surface} />
      </div>
      <SolutionPathSteps steps={steps} divergeIndex={divergeIndex} surface={surface} />
      {onContinue ? (
        <Button type="button" onClick={onContinue} disabled={busy}>
          {continueLabel}
        </Button>
      ) : null}
    </div>
  );
}

export type { SolutionStep, PartialCreditRule, StepFeedbackPartial, StepFeedbackOutcome };

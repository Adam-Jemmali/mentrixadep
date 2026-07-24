"use client";

import { useMemo, useState } from "react";
import { MathInput } from "@/features/quest/components/math-input";
import { StepFeedback } from "@/features/quest/components/step-feedback";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { QuestStimulusBlock } from "@/features/quest/components/quest-stimulus-block";
import {
  matchPartialCredit,
  type SolutionStep,
  type StepFeedbackPartial,
} from "@/features/quest/components/step-feedback-pure";
import { cn } from "@/shared/core/utils";
import type { ItemReviewDetail } from "@/features/admin/item-review";

type Props = {
  item: ItemReviewDetail;
};

export function ItemReviewStudentPreview({ item }: Props) {
  const isFrq = item.itemFormat === "free_response";
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [frqGraded, setFrqGraded] = useState<{
    equivalent: boolean;
    partial: StepFeedbackPartial | null;
  } | null>(null);

  const mcqResult = useMemo(() => {
    if (selectedIndex == null || item.options.length === 0) return null;
    const studentAnswer = item.options[selectedIndex] ?? "";
    const correct = studentAnswer === item.correctAnswer;
    const partial =
      !correct && item.partialCreditRules.length > 0
        ? matchPartialCredit(studentAnswer, item.partialCreditRules, item.correctAnswer)
        : null;
    return { correct, studentAnswer, partial };
  }, [selectedIndex, item]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Student preview
        </p>
        <p className="mt-1 text-[12px] text-slate-500">
          Same controls a Mentrixer sees. First answers still count only in live quests.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--mx-surface-3)] bg-[var(--mx-navy)] p-4 text-slate-100">
        <p className="text-[11px] font-medium text-slate-400">
          Unit {item.unitNumber}. {item.nodeName}
        </p>
        <div className="mt-3 space-y-3">
          <QuestStimulusBlock stimulus={item.stimulus} variant="dark" />
          <div className="text-[15px] leading-relaxed [&_.katex]:text-inherit">
            <PromptWithMath text={item.prompt} variant="dark" />
          </div>
        </div>

        {isFrq ? (
          <div className="mt-4">
            <MathInput
              itemId={item.id}
              correctExpression={item.answerExpression || item.correctAnswer}
              onGraded={(result) => {
                setFrqGraded({ equivalent: result.equivalent, partial: null });
              }}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {item.options.map((option, index) => {
              const selected = selectedIndex === index;
              return (
                <button
                  key={`${option}-${index}`}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors",
                    selected
                      ? "border-[var(--mx-violet)] bg-[var(--mx-violet)]/15 text-white"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-white/25",
                  )}
                >
                  <PromptWithMath text={option} variant="dark" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isFrq && frqGraded ? (
        <StepFeedback
          surface="light"
          outcome={frqGraded.equivalent ? "correct" : frqGraded.partial ? "partial" : "incorrect"}
          studentAnswer={item.answerExpression || undefined}
          correctAnswer={item.answerExpression || item.correctAnswer}
          solutionSteps={item.solutionSteps}
          partialCredit={frqGraded.partial}
          fallbackExplanation={item.explanation}
        />
      ) : null}

      {!isFrq && mcqResult ? (
        <StepFeedback
          surface="light"
          outcome={mcqResult.correct ? "correct" : mcqResult.partial ? "partial" : "incorrect"}
          studentAnswer={mcqResult.studentAnswer}
          correctAnswer={item.correctAnswer}
          solutionSteps={item.solutionSteps as SolutionStep[]}
          partialCredit={mcqResult.partial}
          fallbackExplanation={item.explanation}
        />
      ) : null}

      {item.answerAlternatives.length > 0 ? (
        <p className="text-[12px] text-slate-500">
          Alternatives: {item.answerAlternatives.join(". ")}
        </p>
      ) : null}

      {item.partialCreditRules.length > 0 ? (
        <p className="text-[12px] text-slate-500">
          Partial credit rules: {item.partialCreditRules.length}
        </p>
      ) : null}
    </div>
  );
}

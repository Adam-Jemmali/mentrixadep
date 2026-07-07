"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { PromptWithMath, PromptWithMathInline } from "@/features/quest/ui/prompt-with-math";
import { warmKatex } from "@/features/quest/ui/normalize-math-text";
import { formatTrapInsightHeadline } from "@/features/quest/ap-calc-skill-visual-pure";
import { ApCalcSkillGlyph } from "@/features/quest/ui/ap-calc-skill-glyph";
import { ExamStakesLabel } from "@/shared/ui/tooltip-patterns";
import { cn } from "@/shared/core/utils";
import type { StepTraceCompletion, StepTraceProblem } from "@/features/diagnostics/step-trace-types";
import {
  applyStepTracePick,
  continueAfterStepReveal,
  createStepTraceSession,
  type StepTracePickOutcome,
  type StepTraceSessionState,
} from "@/features/diagnostics/step-trace-pure";

export type { StepTraceCompletion, StepTraceProblem } from "@/features/diagnostics/step-trace-types";

export function StepTraceInput({
  problem,
  variant = "dark",
  onComplete,
  className,
}: {
  problem: StepTraceProblem;
  variant?: "light" | "dark";
  onComplete: (result: StepTraceCompletion) => void;
  className?: string;
}) {
  const [session, setSession] = useState<StepTraceSessionState>(() =>
    createStepTraceSession(problem),
  );
  const [lastOutcome, setLastOutcome] = useState<StepTracePickOutcome["kind"] | null>(null);

  const totalSteps = problem.stepSequence.length;
  const stepIndex = Math.min(session.currentStepIndex, totalSteps - 1);
  const currentStep = problem.stepSequence[stepIndex];
  const liveStep = session.liveSteps[stepIndex];

  useEffect(() => {
    void warmKatex();
  }, []);

  useEffect(() => {
    if (session.complete && session.completion) {
      onComplete(session.completion);
    }
  }, [session.complete, session.completion, onComplete]);

  const applyOutcome = useCallback((outcome: StepTracePickOutcome) => {
    setLastOutcome(outcome.kind);
    setSession(outcome.next);
  }, []);

  const onPick = useCallback(
    (optionIndex: number) => {
      const outcome = applyStepTracePick(problem, session, optionIndex);
      if (outcome) applyOutcome(outcome);
    },
    [applyOutcome, problem, session],
  );

  const onContinue = useCallback(() => {
    const outcome = continueAfterStepReveal(problem, session);
    if (outcome) applyOutcome(outcome);
  }, [applyOutcome, problem, session]);

  const stepPrompt = currentStep?.prompt ?? "";
  const options = currentStep?.options ?? [];
  const correctIndex = currentStep?.correct_option_index ?? 0;

  const showReveal = liveStep?.revealed ?? false;
  const awaitingContinue = liveStep?.awaitingContinue ?? false;
  const canPick = !session.complete && !awaitingContinue;
  const showRetryHint = lastOutcome === "wrong_retry";
  const revealMisconception = liveStep?.misconception_tags[0]?.trim();

  const shellClass =
    variant === "dark"
      ? "border-white/10 bg-[#0F172A]/90 text-white"
      : "border-slate-200 bg-white text-slate-900";

  const optionBase =
    variant === "dark"
      ? "border-white/10 bg-white/[0.04] hover:border-violet-400/50 hover:bg-violet-500/10"
      : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40";

  const stepMetaClass = variant === "dark" ? "text-slate-400" : "text-slate-500";

  const progressPct = useMemo(() => {
    if (session.complete) return 100;
    return Math.round(((stepIndex + (awaitingContinue ? 1 : 0.35)) / totalSteps) * 100);
  }, [awaitingContinue, session.complete, stepIndex, totalSteps]);

  if (!currentStep || !liveStep) return null;

  return (
    <div className={cn("mx-auto w-full max-w-3xl", className)}>
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", stepMetaClass)}>
            Step trace
          </span>
          <span className={cn("text-xs font-medium tabular-nums", stepMetaClass)}>
            Step {stepIndex + 1} of {totalSteps}
          </span>
        </div>
        <div
          className={cn(
            "h-1.5 overflow-hidden rounded-full",
            variant === "dark" ? "bg-white/10" : "bg-slate-200",
          )}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-[#7C3AED] to-[#6366F1]"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className={cn("rounded-2xl border p-6 shadow-sm sm:p-8", shellClass)}>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {problem.nodeName ? (
            <div className="flex items-center gap-2.5">
              <ApCalcSkillGlyph nodeName={problem.nodeName} size="sm" />
              <span
                className={cn(
                  "text-xs font-semibold",
                  variant === "dark" ? "text-slate-200" : "text-slate-700",
                )}
              >
                {problem.nodeName}
              </span>
            </div>
          ) : null}
          {problem.examStakes ? (
            <ExamStakesLabel examStakes={problem.examStakes} tone={variant === "dark" ? "dark" : "light"} />
          ) : null}
        </div>

        <div
          className={cn(
            "text-base font-medium leading-relaxed sm:text-[17px]",
            variant === "dark" ? "text-white" : "text-slate-900",
          )}
        >
          <PromptWithMath text={problem.prompt} variant={variant} />
        </div>

        {stepIndex > 0 || stepPrompt ? (
          <div
            className={cn(
              "mt-6 rounded-xl border px-4 py-3",
              variant === "dark" ? "border-white/10 bg-white/[0.03]" : "border-slate-100 bg-slate-50",
            )}
          >
            <p className={cn("mb-1 text-[10px] font-bold uppercase tracking-[0.16em]", stepMetaClass)}>
              Next move
            </p>
            <div className={cn("text-sm leading-relaxed", variant === "dark" ? "text-slate-200" : "text-slate-800")}>
              <PromptWithMath text={stepPrompt} variant={variant} />
            </div>
          </div>
        ) : null}

        <motion.div
          className="mt-6 grid gap-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {options.map((opt, i) => {
            const isCorrect = i === correctIndex;
            const isRevealedCorrect = showReveal && isCorrect;
            const disabled = !canPick;

            let cardClass = optionBase;
            if (isRevealedCorrect) {
              cardClass =
                variant === "dark"
                  ? "border-[#7C3AED] bg-violet-500/15 ring-1 ring-[#7C3AED]/40"
                  : "border-violet-500 bg-violet-50 ring-1 ring-violet-300";
            } else if (disabled && !isRevealedCorrect) {
              cardClass =
                variant === "dark"
                  ? "border-white/5 bg-white/[0.02] opacity-60"
                  : "border-slate-100 bg-slate-50 opacity-70";
            }

            return (
              <motion.button
                key={`${currentStep.step_number}-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => onPick(i)}
                whileHover={canPick ? { scale: 1.01 } : undefined}
                whileTap={canPick ? { scale: 0.99 } : undefined}
                className={cn(
                  "min-h-[56px] rounded-xl border-2 p-4 text-left text-sm font-medium transition-colors sm:min-h-[60px] sm:text-base",
                  cardClass,
                  canPick ? "cursor-pointer" : "cursor-default",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                      variant === "dark" ? "border-white/20 text-slate-300" : "border-slate-300 text-slate-500",
                      isRevealedCorrect && "border-[#7C3AED] bg-[#7C3AED] text-white",
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className={variant === "dark" ? "text-slate-100" : "text-slate-900"}>
                    <PromptWithMathInline text={opt} />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        <AnimatePresence>
          {showRetryHint ? (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={cn("mt-4 text-sm leading-relaxed", stepMetaClass)}
            >
              That move matches a common trap. You have one more try on this step.
            </motion.p>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {awaitingContinue ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 space-y-3"
            >
              {revealMisconception ? (
                <p className={cn("text-sm leading-relaxed", stepMetaClass)}>
                  Trap:{" "}
                  <span className={variant === "dark" ? "text-violet-200" : "text-violet-700"}>
                    {formatTrapInsightHeadline(revealMisconception)}
                  </span>
                </p>
              ) : null}
              <p className={cn("text-sm leading-relaxed", stepMetaClass)}>
                Correct move highlighted. Trace continues so you still reach a verdict.
              </p>
              <Button
                type="button"
                className="h-11 w-full bg-[#7C3AED] font-semibold text-white hover:bg-[#6D28D9] sm:w-auto"
                onClick={onContinue}
              >
                {stepIndex + 1 >= totalSteps ? "See verdict" : "Continue trace"}
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

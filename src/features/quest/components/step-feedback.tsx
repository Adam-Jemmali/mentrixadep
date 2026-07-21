"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "@/shared/animation/motion";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import {
  diffExpressionParts,
  findDivergeStepIndex,
  hasStepFeedbackTrace,
  stepFeedbackVerdict,
  type PartialCreditRule,
  type SolutionStep,
  type StepFeedbackOutcome,
  type StepFeedbackPartial,
} from "@/features/quest/components/step-feedback-pure";
import { cn } from "@/shared/core/utils";

const STEP_STAGGER_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const STEP_CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

type Props = {
  outcome: StepFeedbackOutcome;
  studentAnswer?: string;
  correctAnswer?: string;
  solutionSteps?: SolutionStep[];
  partialCredit?: StepFeedbackPartial | null;
  fallbackExplanation?: string;
  onContinue?: () => void;
  onPracticeStep?: () => void;
  continueLabel?: string;
  practiceStepLabel?: string;
  busy?: boolean;
  className?: string;
  surface?: "light" | "dark";
  /** Skip sticky shell when nested inside celebration or admin cards. */
  embedded?: boolean;
};

function StepFeedbackShell({
  embedded,
  surface,
  className,
  children,
}: {
  embedded?: boolean;
  surface: "light" | "dark";
  className?: string;
  children: React.ReactNode;
}) {
  if (embedded) {
    return <div className={cn("space-y-4", className)}>{children}</div>;
  }

  return (
    <StudentStickyNote
      variant="taped"
      compact
      color={surface === "dark" ? "neutral" : "yellow"}
      className={cn("step-feedback-sticky", className)}
    >
      <div className="space-y-4 p-1">{children}</div>
    </StudentStickyNote>
  );
}

function AnswerComparePanels({
  studentAnswer,
  correctAnswer,
  surface,
}: {
  studentAnswer: string;
  correctAnswer: string;
  surface: "light" | "dark";
}) {
  const diff = useMemo(
    () => diffExpressionParts(studentAnswer, correctAnswer),
    [studentAnswer, correctAnswer],
  );
  const isLight = surface === "light";

  return (
    <div
      className={cn(
        "answer-compare grid overflow-hidden rounded-[var(--radius-node)] border sm:grid-cols-2",
        isLight ? "border-[var(--mx-rule)] bg-white" : "border-white/10 bg-[var(--mx-navy)]",
      )}
    >
      <div
        className={cn(
          "min-w-0 p-4 sm:border-r",
          isLight ? "border-[var(--mx-rule)]" : "border-white/10",
        )}
      >
        <div className="flex items-center gap-2">
          <MentrixaVocabIcon name="loop-report" size={14} surface={surface} title="Your answer" />
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-[0.14em]",
              isLight ? "text-[var(--mx-muted)]" : "text-white/50",
            )}
          >
            Your answer
          </p>
        </div>
        <div
          className={cn(
            "mt-3 flex flex-wrap items-baseline gap-x-1 text-[15px] leading-relaxed [&_.katex]:text-inherit",
            isLight ? "text-[var(--mx-navy)]" : "text-white",
          )}
        >
          {diff.studentParts.length > 0 ? (
            diff.studentParts.map((part, index) => (
              <span
                key={`student-${part.text}-${index}`}
                className={cn(
                  part.highlight &&
                    "underline decoration-red-500 decoration-wavy decoration-2 underline-offset-4",
                )}
              >
                <PromptWithMath text={part.text} variant={surface} />
              </span>
            ))
          ) : (
            <PromptWithMath text={studentAnswer || "—"} variant={surface} />
          )}
        </div>
      </div>

      <div className="min-w-0 p-4">
        <div className="flex items-center gap-2">
          <MentrixaVocabIcon name="verified" size={14} surface={surface} title="Correct answer" />
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-500">
            Correct answer
          </p>
        </div>
        <div
          className={cn(
            "mt-3 text-[15px] leading-relaxed [&_.katex]:text-inherit",
            isLight ? "text-[var(--mx-navy)]" : "text-white",
          )}
        >
          {diff.correctParts.length > 0 ? (
            diff.correctParts.map((part, index) => (
              <span key={`correct-${part.text}-${index}`} className="inline">
                <PromptWithMath text={part.text} variant={surface} />
              </span>
            ))
          ) : (
            <PromptWithMath text={correctAnswer || "—"} variant={surface} />
          )}
        </div>
      </div>
    </div>
  );
}

function SolutionPathStepRow({
  step,
  surface,
  diverge = false,
  muted = false,
}: {
  step: SolutionStep;
  surface: "light" | "dark";
  diverge?: boolean;
  muted?: boolean;
}) {
  const isLight = surface === "light";

  return (
    <motion.li
      variants={STEP_STAGGER_VARIANTS}
      className={cn(
        "step-trace-item rounded-[var(--radius-node)] px-3 py-3",
        diverge && "divergence-highlight border-l-[3px] border-[var(--mx-primary)] bg-[var(--mx-primary)]/[0.08]",
        !diverge &&
          (isLight
            ? muted
              ? "border border-transparent bg-slate-50/80 opacity-70"
              : "border border-[var(--mx-rule)] bg-white/80"
            : muted
              ? "border border-transparent bg-white/[0.03] opacity-65"
              : "border border-white/10 bg-[var(--mx-navy-2)]/60"),
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mx-primary)]">
          Step {step.step_number}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          {diverge ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mx-primary)]">
              Where reasoning broke
            </p>
          ) : null}
          <p
            className={cn(
              muted ? "text-xs" : "text-[15px]",
              "leading-snug text-[var(--mx-steel)]",
              isLight && !muted && "text-[var(--mx-steel)]",
              !isLight && muted && "text-white/45",
            )}
          >
            {step.description}
          </p>
          {step.expression ? (
            <div
              className={cn(
                "text-sm [&_.katex]:text-inherit",
                step.is_critical && !diverge
                  ? "text-[var(--mx-gold)]"
                  : isLight
                    ? "text-[var(--mx-navy)]"
                    : "text-white",
              )}
            >
              <PromptWithMath text={step.expression} variant={surface} />
            </div>
          ) : null}
          {diverge && step.misconception_if_skipped ? (
            <p className="text-[14px] italic leading-relaxed text-[var(--mx-steel)]">
              {step.misconception_if_skipped}
            </p>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

function SolutionPathAccordion({
  steps,
  surface,
}: {
  steps: SolutionStep[];
  surface: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const isLight = surface === "light";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-node)] border",
        isLight ? "border-[var(--mx-rule)] bg-white/90" : "border-white/10 bg-[var(--mx-navy)]/80",
      )}
    >
      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        whileHover={reduceMotion ? undefined : { scale: 1.015 }}
        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left",
          isLight ? "text-[var(--mx-navy)]" : "text-white",
        )}
      >
        <span className="inline-flex min-w-0 flex-1 items-center gap-2.5">
          <MentrixaVocabIcon name="movement-receipt" size={18} surface={surface} title="Solution path" />
          <span className="text-sm font-semibold leading-snug">See the full solution path</span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </motion.button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="solution-path-panel"
            layout
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <motion.ol
              className={cn(
                "step-trace-items space-y-2 border-t px-3 py-3",
                isLight ? "border-[var(--mx-rule)]" : "border-white/10",
              )}
              variants={STEP_CONTAINER_VARIANTS}
              initial={reduceMotion ? false : "hidden"}
              animate="show"
            >
              {steps.map((step, index) => (
                <SolutionPathStepRow key={`${step.step_number}-${index}`} step={step} surface={surface} />
              ))}
            </motion.ol>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function WrongAnswerReveal({
  studentAnswer,
  correctAnswer,
  steps,
  divergeIndex,
  partialCredit,
  surface,
  onPracticeStep,
  practiceStepLabel,
  onContinue,
  continueLabel,
  busy,
}: {
  studentAnswer: string;
  correctAnswer: string;
  steps: SolutionStep[];
  divergeIndex: number;
  partialCredit?: StepFeedbackPartial | null;
  surface: "light" | "dark";
  onPracticeStep?: () => void;
  practiceStepLabel: string;
  onContinue?: () => void;
  continueLabel: string;
  busy?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const isLight = surface === "light";

  useGsapEffect(
    (gsap) => {
      const root = rootRef.current;
      if (!root || reduceMotion) return;

      const compare = root.querySelector(".answer-compare");
      const items = root.querySelectorAll(".step-trace-item");
      const divergence = root.querySelector(".divergence-highlight");

      gsap.set([compare, items, divergence].filter(Boolean), { clearProps: "all" });

      const timeline = gsap.timeline();
      if (compare) {
        timeline.from(compare, { y: 16, opacity: 0, duration: 0.4, ease: "power2.out" });
      }
      if (items.length > 0) {
        timeline.from(
          items,
          { y: 12, opacity: 0, duration: 0.35, stagger: 0.07, ease: "power2.out" },
          "-=0.1",
        );
      }
      if (divergence) {
        timeline.from(
          divergence,
          { x: -8, opacity: 0, duration: 0.4, ease: "back.out(1.7)" },
          "-=0.1",
        );
      }

      return () => {
        timeline.kill();
      };
    },
    [reduceMotion, steps.length, divergeIndex, studentAnswer, correctAnswer],
  );

  const primaryAction = onPracticeStep ?? onContinue;
  const primaryLabel = onPracticeStep ? practiceStepLabel : continueLabel;

  return (
    <div ref={rootRef} className="space-y-4">
      {partialCredit ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-[var(--radius-node)] border px-3 py-2.5 text-sm",
            isLight
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100",
          )}
        >
          <MentrixaVocabIcon name="rank-proof" size={16} surface={surface} title="Partial credit" />
          <div>
            <p className="font-semibold">{partialCredit.label}</p>
            <p className="mt-0.5 text-[13px] opacity-90">{partialCredit.rightSummary}</p>
          </div>
        </div>
      ) : null}

      <AnswerComparePanels
        studentAnswer={studentAnswer}
        correctAnswer={correctAnswer}
        surface={surface}
      />

      <div>
        <div className="mb-2 flex items-center gap-2">
          <MentrixaVocabIcon name="skill-node" size={16} surface={surface} title="Step trace" />
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-[0.14em]",
              isLight ? "text-[var(--mx-indigo)]" : "text-[var(--mx-indigo)]",
            )}
          >
            Step trace
          </p>
        </div>
        <ol className="step-trace-items space-y-2">
          {steps.map((step, index) => (
            <SolutionPathStepRow
              key={`${step.step_number}-${index}`}
              step={step}
              surface={surface}
              diverge={divergeIndex === index}
              muted={divergeIndex !== index}
            />
          ))}
        </ol>
      </div>

      {primaryAction ? (
        <motion.div whileTap={reduceMotion ? undefined : { scale: 0.96 }}>
          <Button
            type="button"
            disabled={busy}
            onClick={primaryAction}
            className="w-full bg-[var(--mx-primary)] text-white hover:bg-[var(--mx-primary-hover)] sm:w-auto"
          >
            <span className="inline-flex items-center gap-2">
              <MentrixaVocabIcon name="practice-pack" size={16} surface="dark" title={primaryLabel} />
              {primaryLabel}
            </span>
          </Button>
        </motion.div>
      ) : null}
    </div>
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
  onPracticeStep,
  continueLabel = "Next question",
  practiceStepLabel = "Practice this step",
  busy = false,
  className,
  surface = "light",
  embedded = false,
}: Props) {
  const steps = solutionSteps;
  const hasTrace = hasStepFeedbackTrace(steps);
  const reduceMotion = useReducedMotion();
  const divergeIndex = useMemo(
    () => findDivergeStepIndex(steps, studentAnswer, correctAnswer),
    [steps, studentAnswer, correctAnswer],
  );

  if (!hasTrace && fallbackExplanation) {
    return (
      <StepFeedbackShell embedded={embedded} surface={surface} className={className}>
        <div className="flex items-start gap-2">
          <MentrixaVocabIcon name="loop-report" size={18} surface={surface} title="Explanation" />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm font-semibold text-[var(--mx-steel)]">{stepFeedbackVerdict(outcome)}</p>
            <div className="text-sm leading-relaxed">
              <PromptWithMath text={fallbackExplanation} variant={surface} />
            </div>
            {onContinue ? (
              <Button type="button" onClick={onContinue} disabled={busy}>
                {continueLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </StepFeedbackShell>
    );
  }

  if (!hasTrace) return null;

  if (outcome === "correct") {
    return (
      <StepFeedbackShell embedded={embedded} surface={surface} className={className}>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <MentrixaVocabIcon name="verified" size={18} gold surface={surface} title="Verified path" />
            <p className="text-sm font-medium text-[var(--mx-steel)]">
              {stepFeedbackVerdict("correct")}
            </p>
          </div>
          <SolutionPathAccordion steps={steps} surface={surface} />
          {onContinue ? (
            <Button type="button" onClick={onContinue} disabled={busy} variant="outline">
              {continueLabel}
            </Button>
          ) : null}
        </motion.div>
      </StepFeedbackShell>
    );
  }

  return (
    <StepFeedbackShell embedded={embedded} surface={surface} className={className}>
      <WrongAnswerReveal
        studentAnswer={studentAnswer}
        correctAnswer={correctAnswer}
        steps={steps}
        divergeIndex={divergeIndex}
        partialCredit={outcome === "partial" ? partialCredit : null}
        surface={surface}
        onPracticeStep={onPracticeStep}
        practiceStepLabel={practiceStepLabel}
        onContinue={onContinue}
        continueLabel={continueLabel}
        busy={busy}
      />
    </StepFeedbackShell>
  );
}

export type { SolutionStep, PartialCreditRule, StepFeedbackPartial, StepFeedbackOutcome };

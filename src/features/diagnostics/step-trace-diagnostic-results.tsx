"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { DiagnosticVerdict } from "@/features/diagnostics/diagnostic-verdict";
import { ApCalcSkillGlyph } from "@/features/quest/ui/ap-calc-skill-glyph";
import { PromptWithMathInline } from "@/features/quest/ui/prompt-with-math";
import { Button } from "@/shared/ui/button";
import { ExamStakesDisclosure } from "@/shared/ui/disclosure-patterns";
import { cn } from "@/shared/core/utils";



const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.06 },
  },
};

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

function StepChoiceCard({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "wrong" | "correct";
}) {
  return (
    <div
      className={cn(
        "min-h-[56px] rounded-xl border-2 p-4",
        tone === "wrong"
          ? "border-white/15 bg-white/[0.03]"
          : "border-[var(--mx-violet)]/50 bg-violet-500/10 ring-1 ring-[var(--mx-violet)]/30",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-medium leading-relaxed text-slate-100">
        <PromptWithMathInline text={text} />
      </div>
    </div>
  );
}

export function StepTraceDiagnosticResults({
  verdict,
  embedded = false,
  onRunAnother,
  runAnotherLabel = "Run another diagnostic",
  showRunAnother = true,
}: {
  verdict: DiagnosticVerdict;
  embedded?: boolean;
  onRunAnother?: () => void;
  runAnotherLabel?: string;
  showRunAnother?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-[var(--mx-navy)] text-white",
        embedded ? "min-h-[70vh]" : "min-h-dvh",
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          aria-hidden
          className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl"
          animate={reduceMotion ? undefined : { x: [0, 18, 0], y: [0, 12, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.12),transparent_55%)]" />
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10 pb-24 sm:py-14"
      >
        

        <motion.div variants={rise} className="space-y-4">
          <h2
            className={cn(
              "font-bold leading-[1.08] tracking-tight text-white",
              verdict.allCorrectFirstTry ? "text-3xl sm:text-4xl" : "text-[2rem] sm:text-[2.35rem]",
            )}
          >
            {verdict.headline}
          </h2>
          {verdict.subheadline ? (
            <p
              className={cn(
                "text-lg font-semibold sm:text-xl",
                verdict.allCorrectFirstTry ? "text-emerald-300" : "text-violet-300",
              )}
            >
              {verdict.subheadline}
            </p>
          ) : null}
          {verdict.comparisonSentence ? (
            <p className="text-sm leading-relaxed text-slate-400">{verdict.comparisonSentence}</p>
          ) : null}
        </motion.div>

        {!verdict.allCorrectFirstTry && verdict.breakdownSentence ? (
          <motion.div variants={rise} className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <ApCalcSkillGlyph
                nodeName={verdict.nodeName}
                nodeSlug={verdict.nodeSlug}
                unitNumber={verdict.unitNumber}
                unitName={verdict.unitName}
                size="md"
                surface="onDark"
              />
              <p className="text-sm leading-relaxed text-slate-200">{verdict.breakdownSentence}</p>
            </div>

            {verdict.stepComparison ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <StepChoiceCard
                  label="Your move"
                  text={verdict.stepComparison.userChoice}
                  tone="wrong"
                />
                <StepChoiceCard
                  label="Correct next move"
                  text={verdict.stepComparison.correctChoice}
                  tone="correct"
                />
              </div>
            ) : null}
          </motion.div>
        ) : null}

        {verdict.examStakes ? (
          <motion.div variants={rise} className="mt-6">
            <ExamStakesDisclosure examStakes={verdict.examStakes} tone="dark" />
          </motion.div>
        ) : (
          <motion.p variants={rise} className="mt-6 text-sm leading-relaxed text-slate-400">
            {verdict.stakesSentence}
          </motion.p>
        )}

        <motion.p variants={rise} className="mt-6 text-center text-xs text-slate-500">
          {verdict.scoreFootnote}
        </motion.p>

        <motion.div variants={rise} className="mt-8 flex flex-col gap-3">
          <Button
            asChild
            className="h-14 w-full rounded-xl bg-[var(--mx-violet)] text-base font-semibold text-white shadow-[0_12px_40px_rgba(124,58,237,0.35)] hover:bg-[var(--mx-primary-hover)]"
          >
            <Link href="/auth/signup">{verdict.ctaLabel}</Link>
          </Button>
          {showRunAnother && onRunAnother ? (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full rounded-xl border-cyan-400/50 bg-cyan-500/15 text-cyan-50 hover:bg-cyan-500/25"
              onClick={onRunAnother}
            >
              {runAnotherLabel}
            </Button>
          ) : null}
      
        </motion.div>
      </motion.div>
    </div>
  );
}

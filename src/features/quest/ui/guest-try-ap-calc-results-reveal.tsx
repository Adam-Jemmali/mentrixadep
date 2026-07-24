"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { ApCalcGuestDiagnosticVerdict } from "@/features/quest/guest-try-results";
import {
  apCalcSkillVisual,
  formatTrapInsightHeadline,
} from "@/features/quest/ap-calc-skill-visual-pure";
import { ApCalcSkillGlyph } from "@/features/quest/ui/ap-calc-skill-glyph";
import { GuestTryPassportPreview } from "@/features/quest/ui/guest-try-passport-preview";
import type { RankCardData } from "@/features/rank-card/types";
import { Button } from "@/shared/ui/button";
import { ProgressCircle } from "@/shared/ui/progress-circle";
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

function useAnimatedNumber(target: number, durationMs = 900) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduceMotion]);

  return value;
}

function DiagnosticScoreRing({
  correct,
  total,
  allCorrect,
}: {
  correct: number;
  total: number;
  allCorrect: boolean;
}) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const animatedAccuracy = useAnimatedNumber(accuracy);
  const color = allCorrect ? "success" : accuracy >= 60 ? "warning" : "danger";

  return (
    <div className="relative inline-flex">
      <motion.div
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.12 }}
        className={cn(
          "absolute -inset-3 rounded-full blur-2xl",
          allCorrect ? "bg-emerald-500/20" : "bg-violet-500/25",
        )}
      />
      <div className="relative">
        <ProgressCircle
          aria-label={`${correct} of ${total} correct`}
          value={animatedAccuracy}
          minValue={0}
          maxValue={100}
          size="lg"
          color={color}
        >
          <ProgressCircle.Track className="!h-28 !w-28 sm:!h-32 sm:!w-32">
            <ProgressCircle.TrackCircle className="stroke-white/10" />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={cn(
              "font-mono text-3xl font-black tabular-nums leading-none sm:text-4xl",
              allCorrect ? "text-emerald-300" : "text-white",
            )}
          >
            {animatedAccuracy}%
          </span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {correct}/{total}
          </span>
        </span>
      </div>
    </div>
  );
}

function WeakestSkillCard({ verdict }: { verdict: ApCalcGuestDiagnosticVerdict }) {
  const visual = apCalcSkillVisual({
    nodeName: verdict.weakestNodeName,
    nodeSlug: verdict.weakestNodeSlug,
    unitNumber: verdict.weakestUnitNumber,
    unitName: verdict.weakestUnitName,
  });

  return (
    <motion.div
      variants={rise}
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
    >
      <ApCalcSkillGlyph
        nodeName={verdict.weakestNodeName}
        nodeSlug={verdict.weakestNodeSlug}
        unitNumber={verdict.weakestUnitNumber}
        unitName={verdict.weakestUnitName}
        size="lg"
        surface="onDark"
      />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Weakest skill in this sample
        </p>
        <p className="mt-1 text-base font-semibold leading-snug text-white sm:text-lg">
          {verdict.weakestNodeName}
        </p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">{visual.unitLabel}</p>
      </div>
    </motion.div>
  );
}

function TrapInsightCard({
  verdict,
}: {
  verdict: ApCalcGuestDiagnosticVerdict;
}) {
  if (verdict.allCorrect) {
    return (
      <motion.div
        variants={rise}
        className="flex items-start gap-4 rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 to-transparent p-4"
      >
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 p-2">
          <Image src="/images/approved.webp" alt="" width={32} height={32} className="size-8 object-contain" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/90">
            Clean sample
          </p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-50">
            Every item landed. The full skill tree is still wider than five questions.
          </p>
        </div>
      </motion.div>
    );
  }

  const trapHeadline = verdict.trapInsight
    ? formatTrapInsightHeadline(verdict.trapInsight)
    : verdict.gapSentence;

  return (
    <motion.div
      variants={rise}
      className="flex items-start gap-4 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-[var(--mx-navy-2)]/40 to-transparent p-4"
    >
      <ApCalcSkillGlyph
        nodeName={verdict.weakestNodeName}
        nodeSlug={verdict.weakestNodeSlug}
        unitNumber={verdict.weakestUnitNumber}
        unitName={verdict.weakestUnitName}
        size="md"
        surface="onDark"
        className="opacity-90"
      />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
          The trap
        </p>
        <p className="mt-1 text-base font-semibold leading-snug text-white sm:text-lg">
          {trapHeadline}
        </p>
      </div>
    </motion.div>
  );
}

export function GuestTryApCalcResultsReveal({
  verdict,
  correct,
  total,
  wouldXp: _wouldXp = 0,
  embedded = false,
  passportPreview = null,
  onRunAnother,
  runAnotherLabel = "Run another diagnostic",
  showRunAnother = true,
}: {
  verdict: ApCalcGuestDiagnosticVerdict;
  correct: number;
  total: number;
  wouldXp?: number;
  embedded?: boolean;
  passportPreview?: RankCardData | null;
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
        <motion.div
          aria-hidden
          className="absolute -right-16 bottom-16 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl"
          animate={reduceMotion ? undefined : { x: [0, -14, 0], y: [0, -10, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.12),transparent_55%)]" />
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10 pb-24 sm:py-14"
      >
        <motion.div variants={rise} className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300/70">
            AP Calculus AB diagnostic
            <span className="mx-2 text-white/15">| </span>
            Sample verdict
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <motion.div variants={rise} className="min-w-0 space-y-4">
            <div>
              <h2
                className={cn(
                  "font-bold leading-[1.08] tracking-tight text-white",
                  verdict.allCorrect ? "text-3xl sm:text-4xl" : "text-[2rem] sm:text-[2.35rem]",
                )}
              >
                {verdict.verdictLine1}
              </h2>
              <p
                className={cn(
                  "mt-2 text-lg font-semibold sm:text-xl",
                  verdict.allCorrect ? "text-emerald-300" : "text-violet-300",
                )}
              >
                {verdict.verdictLine2}
              </p>
            </div>
            <WeakestSkillCard verdict={verdict} />
          </motion.div>

          <motion.div variants={rise} className="flex justify-center lg:justify-end">
            <DiagnosticScoreRing correct={correct} total={total} allCorrect={verdict.allCorrect} />
          </motion.div>
        </div>

        <div className="mt-6 space-y-4">
          <TrapInsightCard verdict={verdict} />

          {verdict.examStakes ? (
            <motion.div variants={rise}>
              <ExamStakesDisclosure examStakes={verdict.examStakes} tone="dark" />
            </motion.div>
          ) : null}

          {passportPreview ? (
            <GuestTryPassportPreview data={passportPreview} />
          ) : null}

          <motion.div variants={rise} className="flex flex-col gap-3 pt-1">
            <Button
              asChild
              className="h-14 w-full rounded-xl bg-[var(--mx-violet)] text-base font-semibold text-white shadow-[0_12px_40px_rgba(124,58,237,0.35)] hover:bg-[var(--mx-primary-hover)]"
            >
              <Link href="/auth/signup">Save this and start fixing it</Link>
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
        </div>
      </motion.div>
    </div>
  );
}

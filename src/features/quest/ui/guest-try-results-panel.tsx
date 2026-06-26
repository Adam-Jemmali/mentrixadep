"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { GuestTryApCalcResultsReveal } from "@/features/quest/ui/guest-try-ap-calc-results-reveal";
import { GuestTrySkillSummaryCard } from "@/features/quest/ui/guest-try-skill-card";
import type { ApCalcGuestDiagnosticVerdict } from "@/features/quest/guest-try-results";
import type { GuestTrySkillSummary } from "@/features/quest/guest-try-skill-summary";
import { Button } from "@/shared/ui/button";
import { ProgressCircle } from "@/shared/ui/progress-circle";
import { MentrixaBrandMark } from "@/shared/ui/mentrixa-ui-brand";
import { cn } from "@/shared/core/utils";

export type GuestTryResultsPanelProps = {
  embedded?: boolean;
  subjectName: string;
  correct: number;
  total: number;
  streakRecord: number;
  wouldXp: number;
  skillSummary?: GuestTrySkillSummary | null;
  apCalcVerdict?: ApCalcGuestDiagnosticVerdict | null;
  onRunAnother?: () => void;
  runAnotherLabel?: string;
  showRunAnother?: boolean;
  signupHint?: string;
};

function GenericQuestResultsReveal({
  embedded,
  correct,
  total,
  streakRecord,
  wouldXp,
  skillSummary,
  onRunAnother,
  runAnotherLabel,
  showRunAnother,
  signupHint,
}: Omit<GuestTryResultsPanelProps, "subjectName" | "apCalcVerdict">) {
  const reduceMotion = useReducedMotion();
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-[#0a1628] text-white",
        embedded ? "min-h-[70vh]" : "min-h-dvh",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12),transparent_55%)]" />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative z-10 mx-auto w-full max-w-2xl px-4 py-10 pb-24 sm:py-12 sm:pb-28"
      >
        <div className="mb-8 flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="relative">
            <ProgressCircle
              aria-label={`${correct} of ${total} correct`}
              value={accuracy}
              minValue={0}
              maxValue={100}
              size="lg"
              color={accuracy >= 80 ? "success" : accuracy >= 50 ? "warning" : "danger"}
            >
              <ProgressCircle.Track className="!h-24 !w-24 sm:!h-28 sm:!w-28">
                <ProgressCircle.TrackCircle className="stroke-white/10" />
                <ProgressCircle.FillCircle />
              </ProgressCircle.Track>
            </ProgressCircle>
            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-black tabular-nums">{accuracy}%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {correct}/{total}
              </span>
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-black italic tracking-tighter text-white sm:text-4xl">
              QUEST COMPLETE
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Best streak {streakRecord} · Would earn {wouldXp} XP with an account
            </p>
          </div>
        </div>

        <div className="w-full rounded-[2.5rem] border border-white/10 bg-[#0c1829]/95 p-6 sm:p-8">
          {skillSummary && skillSummary.lines.length > 0 ? (
            <GuestTrySkillSummaryCard
              summary={skillSummary}
              className="mb-8 !backdrop-blur-none bg-white/[0.04]"
            />
          ) : null}

          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <MentrixaBrandMark kind="mentrixer" size="sm" className="shrink-0 opacity-85" />
            <p className="text-sm leading-relaxed text-slate-300">
              This run does not count toward verified rank until you sign up and hit first attempts on each skill node.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button
              asChild
              className="h-14 w-full rounded-2xl bg-white text-base font-semibold text-slate-900 hover:bg-slate-100"
            >
              <Link href="/auth/signup">{signupHint}</Link>
            </Button>
            {showRunAnother && onRunAnother ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-2xl border-2 border-cyan-400/80 bg-cyan-500/20 font-semibold text-cyan-50"
                onClick={onRunAnother}
              >
                {runAnotherLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function GuestTryResultsPanel({
  embedded = false,
  subjectName: _subjectName,
  correct,
  total,
  streakRecord,
  wouldXp,
  skillSummary = null,
  apCalcVerdict = null,
  onRunAnother,
  runAnotherLabel = "Run another diagnostic",
  showRunAnother = true,
  signupHint = "Create your free account to save rank, XP, and skill progress",
}: GuestTryResultsPanelProps) {
  if (apCalcVerdict) {
    return (
      <GuestTryApCalcResultsReveal
        verdict={apCalcVerdict}
        correct={correct}
        total={total}
        wouldXp={wouldXp}
        embedded={embedded}
        onRunAnother={onRunAnother}
        runAnotherLabel={runAnotherLabel}
        showRunAnother={showRunAnother}
      />
    );
  }

  return (
    <GenericQuestResultsReveal
      embedded={embedded}
      correct={correct}
      total={total}
      streakRecord={streakRecord}
      wouldXp={wouldXp}
      skillSummary={skillSummary}
      onRunAnother={onRunAnother}
      runAnotherLabel={runAnotherLabel}
      showRunAnother={showRunAnother}
      signupHint={signupHint}
    />
  );
}

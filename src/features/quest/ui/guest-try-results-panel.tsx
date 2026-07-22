"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { GuestTryApCalcResultsReveal } from "@/features/quest/ui/guest-try-ap-calc-results-reveal";
import { GuestTrySkillSummaryCard } from "@/features/quest/ui/guest-try-skill-card";
import { GuestTryPassportPreview } from "@/features/quest/ui/guest-try-passport-preview";
import type { ApCalcGuestDiagnosticVerdict } from "@/features/quest/guest-try-results";
import type { GuestTrySkillSummary } from "@/features/quest/guest-try-skill-summary";
import type { RankCardData } from "@/features/rank-card/types";
import { Button } from "@/shared/ui/button";
import { ProgressCircle } from "@/shared/ui/progress-circle";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
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
  passportPreview?: RankCardData | null;
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
  passportPreview,
  onRunAnother,
  runAnotherLabel,
  showRunAnother,
  signupHint,
}: Omit<GuestTryResultsPanelProps, "subjectName" | "apCalcVerdict">) {
  const reduceMotion = useReducedMotion();
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className={cn("mentrix-student-type-scope mx-auto w-full max-w-4xl px-4 py-10", embedded ? "pb-16" : "pb-24")}>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className={`${mentrixStudent.card} space-y-6 p-6 sm:p-8`}
      >
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
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
                <ProgressCircle.TrackCircle className="stroke-[#E0E7FF]" />
                <ProgressCircle.FillCircle />
              </ProgressCircle.Track>
            </ProgressCircle>
            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-black tabular-nums text-[#0B1220]">{accuracy}%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">
                {correct}/{total}
              </span>
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0B1220] sm:text-3xl">Quest complete</h2>
            <p className="mt-2 text-sm text-[#475569]">
              Best streak {streakRecord}. Would earn {wouldXp} XP with an account
            </p>
          </div>
        </div>

        {skillSummary && skillSummary.lines.length > 0 ? (
          <GuestTrySkillSummaryCard summary={skillSummary} className="!bg-white/80" />
        ) : null}

        <p className="text-sm leading-relaxed text-[#475569]">
          This run does not count toward verified rank until you sign up and lock your first answer on each skill.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-12 flex-1" variant="workbenchPrimary">
            <Link href="/auth/signup">{signupHint}</Link>
          </Button>
          {showRunAnother && onRunAnother ? (
            <Button type="button" variant="outline" className="h-12 flex-1 border-[#A5B4FC] text-[#4F46E5]" onClick={onRunAnother}>
              {runAnotherLabel}
            </Button>
          ) : null}
        </div>
      </motion.div>

      {passportPreview ? <GuestTryPassportPreview data={passportPreview} className="mt-10" /> : null}
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
  passportPreview = null,
  onRunAnother,
  runAnotherLabel = "Run another pack",
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
        passportPreview={passportPreview}
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
      passportPreview={passportPreview}
      onRunAnother={onRunAnother}
      runAnotherLabel={runAnotherLabel}
      showRunAnother={showRunAnother}
      signupHint={signupHint}
    />
  );
}

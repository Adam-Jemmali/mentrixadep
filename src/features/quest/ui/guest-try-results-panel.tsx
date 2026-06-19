"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/shared/ui/button";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { GuestTryRankPreview } from "@/features/quest/ui/guest-try-rank-preview";
import { GuestTrySkillSummaryCard } from "@/features/quest/ui/guest-try-skill-card";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { ShareScoreCardButton } from "@/features/quest/ui/share-score-card";
import type { ApCalcGuestResultsSummary } from "@/features/quest/guest-try-results";
import type { GuestTrySkillSummary } from "@/features/quest/guest-try-skill-summary";
import { cn } from "@/shared/core/utils";

export type GuestTryResultsPanelProps = {
  embedded?: boolean;
  subjectName: string;
  correct: number;
  total: number;
  streakRecord: number;
  wouldXp: number;
  skillSummary?: GuestTrySkillSummary | null;
  apCalcSummary?: ApCalcGuestResultsSummary | null;
  onRunAnother?: () => void;
  runAnotherLabel?: string;
  showRunAnother?: boolean;
  signupHint?: string;
};

export function GuestTryResultsPanel({
  embedded = false,
  subjectName,
  correct,
  total,
  streakRecord,
  wouldXp,
  skillSummary = null,
  apCalcSummary = null,
  onRunAnother,
  runAnotherLabel = "Run another pack",
  showRunAnother = true,
  signupHint = "Create your free account to save rank, XP, and skill progress",
}: GuestTryResultsPanelProps) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isPerfect = total > 0 && correct === total;
  const isApCalcTry = Boolean(apCalcSummary);

  return (
    <div
      className={cn(
        "w-full bg-[#0a1628] text-white",
        embedded ? "relative min-h-[70vh]" : "relative min-h-dvh",
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 opacity-[0.14] bg-[radial-gradient(ellipse_at_50%_0%,#3b82f6_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/30 via-transparent to-[#0a1628]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-10 pb-24 sm:py-12 sm:pb-28 [contain:layout_style]">
        <div className="mb-8 text-center">
          <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tighter drop-shadow-[0_0_12px_rgba(59,130,246,0.45)]">
            {isPerfect ? "PERFECT" : "QUEST COMPLETE"}
          </h2>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.4em] text-blue-400/80">
            Mission Accomplished
          </p>
        </div>

        <div className="w-full rounded-[2.5rem] border border-white/10 bg-[#0c1829]/95 p-6 sm:p-8 shadow-[0_0_60px_-24px_rgba(59,130,246,0.35)]">
          <GuestTryRankPreview
            totalXp={wouldXp}
            beforeXp={0}
            variant="progression"
            className="mb-8"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-3xl bg-white/5 border border-white/5 p-6 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Accuracy</p>
              <div className="text-4xl font-black text-blue-400 tabular-nums">{accuracy}%</div>
            </div>
            <div className="rounded-3xl bg-white/5 border border-white/5 p-6 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Correct</p>
              <div className="text-4xl font-black text-blue-400 tabular-nums">
                {apCalcSummary ? (
                  <span className="text-2xl sm:text-3xl leading-tight text-center block">
                    {apCalcSummary.scoreLine}
                  </span>
                ) : (
                  `${correct}/${total}`
                )}
              </div>
            </div>
            <div className="rounded-3xl bg-white/5 border border-white/5 p-6 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Best streak</p>
              <div className="text-4xl font-black text-amber-400 tabular-nums">{streakRecord}</div>
              <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-tighter">Correct in a row</p>
            </div>
          </div>

          {apCalcSummary ? (
            <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
              <div className="space-y-2">
                {apCalcSummary.unitLines.map((line) => (
                  <p key={line} className="text-sm text-slate-200">
                    {line}
                  </p>
                ))}
              </div>
              <p className="mt-4 text-sm font-medium text-blue-200">{apCalcSummary.weakestLine}</p>
            </div>
          ) : null}

          {!apCalcSummary && skillSummary && skillSummary.lines.length > 0 ? (
            <GuestTrySkillSummaryCard
              summary={skillSummary}
              className="mb-8 !backdrop-blur-none bg-white/[0.04]"
            />
          ) : null}

          {skillSummary && skillSummary.mistakeReviews.length > 0 ? (
            <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
                Review mistakes
              </p>
              <ul className="space-y-4">
                {skillSummary.mistakeReviews.slice(0, 4).map((m, idx) => (
                  <li
                    key={m.questionId}
                    className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-3 [content-visibility:auto] [contain-intrinsic-size:0_160px]"
                  >
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                        Question {idx + 1}
                      </p>
                      <PromptWithMath text={m.prompt} variant="dark" />
                    </div>
                    <div className="border-t border-white/5 pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                        Explanation
                      </p>
                      <PromptWithMath text={m.review} variant="dark" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/20 p-8 text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-3 relative z-10">
              XP preview. Same as students
            </p>
            <div className="flex items-center justify-center gap-4 relative z-10">
              <div className="relative h-14 w-14 shrink-0">
                <Image
                  src={MENTRIXA_LOGO_PNG}
                  alt=""
                  fill
                  className="object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                  sizes="56px"
                />
              </div>
              <div className="text-left">
                <span className="block text-4xl font-black text-white leading-none tabular-nums">
                  +{wouldXp} XP
                </span>
                <span className="text-[10px] font-medium text-blue-400/80 uppercase tracking-tighter">
                  Experience Points
                </span>
              </div>
            </div>
            
          </div>

          <div className="flex flex-col items-center gap-3">
            <ShareScoreCardButton
              title={`${subjectName} Quest`}
              scoreLine={`${correct}/${total}, ${accuracy}%`}
              xpLine={`+${wouldXp} XP preview`}
              playerName="Guest"
            />
            <Button
              asChild
              className="h-14 w-full rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-base font-semibold shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              <Link href="/auth/signup">
                {isApCalcTry
                  ? "Create your free account to save this rank and score"
                  : signupHint}
              </Link>
            </Button>
            {showRunAnother && onRunAnother ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-2xl border-2 border-cyan-400/80 bg-cyan-500/20 text-cyan-50 font-semibold shadow-[0_0_24px_-6px_rgba(34,211,238,0.45)] hover:bg-cyan-400/30 hover:border-cyan-300 hover:text-white"
                onClick={onRunAnother}
              >
                {runAnotherLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

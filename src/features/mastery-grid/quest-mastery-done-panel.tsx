"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import type { MasteryGridData, MasteryNodeState } from "@/features/mastery-grid/types";
import { RankDeltaVerdictVisual } from "@/features/guidance/ui/rank-delta-verdict-visual";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import {
  inferQuestPostPackPhaseFromNextAction,
  questPostPackPhaseLabel,
  SOLID_PRACTICE_PERCENT,
} from "@/features/quest/quest-post-step-pure";
import { cn } from "@/shared/core/utils";

export function QuestMasteryDonePanel({
  grid,
  verdict,
  highlightTransition,
  correct,
  total,
  xpAwarded,
  perfectBonus,
  streakDays,
  onNewPack,
}: {
  grid: MasteryGridData;
  verdict: Verdict;
  highlightTransition?: {
    nodeId: string;
    fromState: MasteryNodeState;
    toState: MasteryNodeState;
  };
  correct: number;
  total: number;
  xpAwarded: number;
  perfectBonus: number;
  streakDays?: number;
  onNewPack: () => void;
}) {
  const xpTotal = xpAwarded + perfectBonus;
  const secondaryParts: string[] = [`${correct}/${total} this pack`];
  if (xpTotal > 0) secondaryParts.push(`+${xpTotal} XP`);
  if (streakDays != null && streakDays > 0) {
    secondaryParts.push(`${streakDays} day streak`);
  }

  const phase = inferQuestPostPackPhaseFromNextAction(verdict.nextAction.label);
  const practiceFirst = phase === "practice_to_green";
  const lockRankNext = phase === "quest_to_verify";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-12 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className={mentrixStudent.sectionEyebrow}>Pack complete</p>
        <h2 className={`mt-2 ${mentrixStudent.cardTitle} sm:text-2xl`}>
          Your mastery map updated
        </h2>
        <p className={`mt-2 max-w-xl text-sm leading-relaxed ${mentrixStudent.textMutedOnDark}`}>
          Green means solid in practice at {SOLID_PRACTICE_PERCENT}%+. Gold locks rank on your first answer only.
        </p>
      </header>

      <MasteryGrid
        data={grid}
        hideNextAction
        showLegend
        highlightTransition={highlightTransition}
      />

      <section
        className={cn(
          "mt-6 rounded-xl border-2 p-5 sm:p-6",
          practiceFirst
            ? "border-emerald-500/40 bg-emerald-950/20"
            : lockRankNext
              ? "border-[#7C3AED]/40 bg-[#7C3AED]/10"
              : mentrixStudent.card,
        )}
        aria-labelledby="quest-next-step-heading"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className={mentrixStudent.sectionEyebrow} id="quest-next-step-heading">
            Your next step
          </p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              practiceFirst
                ? "bg-emerald-500/20 text-emerald-300"
                : lockRankNext
                  ? "bg-[#7C3AED]/25 text-violet-200"
                  : "bg-slate-700/50 text-slate-300",
            )}
          >
            {questPostPackPhaseLabel(phase)}
          </span>
        </div>

        {practiceFirst ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-200/90">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-1">
              <span className="h-3 w-3 rounded-sm bg-amber-300/90" aria-hidden />
              Now
            </span>
            <span aria-hidden>→</span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-900/30 px-2 py-1 font-semibold text-emerald-100">
              <span className="h-3 w-3 rounded-sm bg-emerald-400/90" aria-hidden />
              Solid green ({SOLID_PRACTICE_PERCENT}%+)
            </span>
          </div>
        ) : null}

        <h3 className="mt-4 text-lg font-semibold leading-snug text-white sm:text-xl">
          {verdict.changed}
        </h3>
        {verdict.reason ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{verdict.reason}</p>
        ) : null}
        {verdict.comparison ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{verdict.comparison}</p>
        ) : null}

        {verdict.rankDelta ? (
          <div className="mt-4 border-t border-white/10 pt-4">
            <RankDeltaVerdictVisual meta={verdict.rankDelta} nextAction={verdict.nextAction} tone="dark" />
          </div>
        ) : null}
      </section>

      <p className="mt-4 font-mono text-xs tabular-nums text-[#64748B]">
        {secondaryParts.join(" · ")}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {!verdict.rankDelta ? (
          <Button className="min-h-11 flex-1" variant="workbenchPrimary" asChild>
            <Link href={verdict.nextAction.href}>{verdict.nextAction.label}</Link>
          </Button>
        ) : null}
        {practiceFirst ? (
          <Button className="min-h-11 flex-1" variant={verdict.rankDelta ? "workbenchPrimary" : "outline"} asChild>
            <Link href="/student/mastery">View mastery grid</Link>
          </Button>
        ) : (
          <Button className="min-h-11 flex-1" variant={verdict.rankDelta ? "workbenchPrimary" : "outline"} onClick={onNewPack}>
            New verified pack
          </Button>
        )}
        <Button className="min-h-11 flex-1" variant="outline" asChild>
          <Link href="/student">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}

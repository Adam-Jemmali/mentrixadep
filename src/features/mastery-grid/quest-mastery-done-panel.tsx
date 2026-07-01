"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import type { MasteryGridData, MasteryNodeState } from "@/features/mastery-grid/types";
import { VerdictPanel } from "@/features/guidance/verdict-panel";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";

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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-12 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className={mentrixStudent.sectionEyebrow}>Pack complete</p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
          Your mastery map updated
        </h2>
        <p className={`mt-2 max-w-xl text-sm leading-relaxed ${mentrixStudent.textMutedOnDark}`}>
          Each square is one skill node. Rank uses first attempts only.
        </p>
      </header>

      <MasteryGrid
        data={grid}
        hideNextAction
        showLegend
        highlightTransition={highlightTransition}
      />

      <div className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-[#0F172A]/90 p-5 sm:p-6">
        <VerdictPanel verdict={verdict} tone="dark" />
        <p className="font-mono text-xs tabular-nums text-slate-500">
          {secondaryParts.join(" · ")}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          className="min-h-11 flex-1"
          variant="workbenchPrimary"
          onClick={onNewPack}
        >
          New verified pack
        </Button>
        <Button
          className="min-h-11 flex-1"
          variant="outline"
          asChild
        >
          <Link href="/student">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}

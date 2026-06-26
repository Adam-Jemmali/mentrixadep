"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import { flattenMasteryNodes } from "@/features/mastery-grid/mastery-grid-pure";
import type { MasteryGridData, MasteryNodeState } from "@/features/mastery-grid/types";
import { SkillNodeStrengthMeter } from "@/shared/ui/meter-patterns";

export function QuestMasteryDonePanel({
  grid,
  verdictLine,
  nextActionLine,
  highlightTransition,
  xpAwarded,
  perfectBonus,
  streakDays,
  onNewPack,
}: {
  grid: MasteryGridData;
  verdictLine: string;
  nextActionLine: string;
  highlightTransition?: {
    nodeId: string;
    fromState: MasteryNodeState;
    toState: MasteryNodeState;
  };
  xpAwarded: number;
  perfectBonus: number;
  streakDays?: number;
  onNewPack: () => void;
}) {
  const xpTotal = xpAwarded + perfectBonus;
  const footnoteParts: string[] = [];
  if (xpTotal > 0) footnoteParts.push(`+${xpTotal} XP`);
  if (streakDays != null && streakDays > 0) {
    footnoteParts.push(`${streakDays} day streak`);
  }

  const highlightNode = highlightTransition
    ? flattenMasteryNodes(grid).find((node) => node.id === highlightTransition.nodeId)
    : null;

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
        {highlightNode ? (
          <SkillNodeStrengthMeter
            nodeName={highlightNode.nodeName}
            state={highlightNode.state}
            accuracyPercent={highlightNode.accuracyPercent}
            tone="dark"
          />
        ) : null}
        <p className="text-base font-semibold leading-relaxed text-white sm:text-lg">
          {verdictLine}
        </p>
        <p className={`text-sm leading-relaxed ${mentrixStudent.textMutedOnDark}`}>
          {nextActionLine}
        </p>
        {footnoteParts.length > 0 ? (
          <p className="pt-1 font-mono text-xs tabular-nums text-slate-500">
            {footnoteParts.join(" · ")}
          </p>
        ) : null}
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

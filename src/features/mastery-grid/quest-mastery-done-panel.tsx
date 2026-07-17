"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { MasteryGridData, QuestMasteryHighlight } from "@/features/mastery-grid/types";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import { buildQuestPostPackCtas } from "@/features/quest/quest-post-step-pure";

export function QuestMasteryDonePanel({
  grid,
  verdict,
  masteryHighlight,
  packSkillNodeIds = [],
  correct,
  total,
  xpAwarded,
  perfectBonus,
  streakDays,
  onNewPack,
}: {
  grid: MasteryGridData;
  verdict: Verdict;
  masteryHighlight?: QuestMasteryHighlight | null;
  packSkillNodeIds?: string[];
  correct: number;
  total: number;
  xpAwarded: number;
  perfectBonus: number;
  streakDays?: number;
  onNewPack: () => void;
}) {
  const xpTotal = xpAwarded + perfectBonus;
  const metaParts: string[] = [`${correct}/${total}`];
  if (xpTotal > 0) metaParts.push(`+${xpTotal} XP`);
  if (streakDays != null && streakDays > 0) {
    metaParts.push(`${streakDays}d streak`);
  }

  const ctas = buildQuestPostPackCtas({
    verdict,
    grid,
    packNodeIds: packSkillNodeIds,
    highlight: masteryHighlight,
  });

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <header className="text-center">
        <p className={mentrixStudent.sectionEyebrow}>Pack complete</p>
        <p className="mt-2 font-mono text-xs tabular-nums text-[#94A3B8]">
          {metaParts.join(" · ")}
        </p>
      </header>

      <p className="mt-8 text-center text-lg font-semibold leading-snug text-white sm:text-xl">
        {verdict.changed}
      </p>

      <div className="mt-8 flex flex-col gap-2.5">
        {ctas.map((cta) => {
          if (cta.key === "pack") {
            return (
              <Button
                key={cta.key}
                type="button"
                className="min-h-11 w-full"
                variant="outline"
                onClick={onNewPack}
              >
                {cta.label}
              </Button>
            );
          }

          if (!cta.href) return null;

          if (cta.kind === "primary") {
            return (
              <Button
                key={cta.key}
                className="min-h-12 w-full"
                variant="workbenchPrimary"
                asChild
              >
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            );
          }

          if (cta.kind === "secondary") {
            return (
              <Button
                key={cta.key}
                className="min-h-11 w-full"
                variant="outline"
                asChild
              >
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            );
          }

          return (
            <Button
              key={cta.key}
              className="min-h-10 w-full text-slate-400"
              variant="ghost"
              asChild
            >
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

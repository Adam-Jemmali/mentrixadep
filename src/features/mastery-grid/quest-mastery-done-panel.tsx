"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { MasteryGridData, QuestMasteryHighlight } from "@/features/mastery-grid/types";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import { VerdictPanel } from "@/features/guidance/verdict-panel";
import { buildQuestPostPackCtas } from "@/features/quest/quest-post-step-pure";
import { peerTopPercent } from "@/features/xp/rank-statistics-pure";

export function QuestMasteryDonePanel({
  grid,
  verdict,
  masteryHighlight,
  packSkillNodeIds = [],
  correct,
  total,
  xpAwarded,
  perfectBonus,
}: {
  grid: MasteryGridData;
  verdict: Verdict;
  masteryHighlight?: QuestMasteryHighlight | null;
  packSkillNodeIds?: string[];
  correct: number;
  total: number;
  xpAwarded: number;
  perfectBonus: number;
}) {
  const xpTotal = xpAwarded + perfectBonus;
  const questAccuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const percentile = verdict.rankDelta?.percentile?.current;
  const workedNodeName =
    masteryHighlight?.nodeName ??
    grid.units
      .flatMap((unit) => unit.nodes)
      .find((node) => packSkillNodeIds.includes(node.id))?.nodeName ??
    "AP Calculus AB";

  const metaParts: string[] = [`${questAccuracy}% quest accuracy`];
  if (percentile != null) {
    metaParts.push(`Top ${peerTopPercent(percentile)}% verified`);
  }
  if (xpTotal > 0) metaParts.push(`+${xpTotal} XP`);

  const ctas = buildQuestPostPackCtas(verdict);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <header className="text-center">
        <p className={mentrixStudent.sectionEyebrow}>Pack complete</p>
        <p className="mt-3 text-sm font-semibold text-[#0B1220]">
          Worked on: {workedNodeName}
        </p>
        <p className="mt-1.5 font-mono text-xs tabular-nums text-[#475569]">
          {metaParts.join(" · ")}
        </p>
      </header>

      <div className="mt-8">
        <VerdictPanel verdict={verdict} tone="light" showNextAction={false} />
      </div>

      <div className="mt-8 flex flex-col gap-2.5">
        {ctas.map((cta) => {
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

"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import type { MasteryGridData, MasteryNodeState, QuestMasteryHighlight } from "@/features/mastery-grid/types";
import { RankDeltaVerdictVisual } from "@/features/guidance/ui/rank-delta-verdict-visual";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import {
  buildQuestPostPackChoices,
  inferQuestPostPackPhaseFromNextAction,
  questPostPackPhaseLabel,
  SOLID_PRACTICE_PERCENT,
} from "@/features/quest/quest-post-step-pure";
import { cn } from "@/shared/core/utils";

function PostPackChoiceCard({
  eyebrow,
  choice,
  primary = false,
}: {
  eyebrow: string;
  choice: { label: string; hint: string; href: string; nodeName: string };
  primary?: boolean;
}) {
  return (
    <Link
      href={choice.href}
      className={cn(
        "block rounded-xl border-2 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]",
        primary
          ? "border-[#7C3AED]/50 bg-[#7C3AED]/10 hover:border-[#7C3AED]/70"
          : "border-[#334155] bg-[#0f172a]/60 hover:border-[#6366F1]/50",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6366F1]">{eyebrow}</p>
      <p className="mt-2 text-base font-semibold leading-snug text-white">{choice.label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{choice.hint}</p>
    </Link>
  );
}

export function QuestMasteryDonePanel({
  grid,
  verdict,
  highlightTransition,
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
  highlightTransition?: {
    nodeId: string;
    fromState: MasteryNodeState;
    toState: MasteryNodeState;
  };
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
  const secondaryParts: string[] = [`${correct}/${total} this pack`];
  if (xpTotal > 0) secondaryParts.push(`+${xpTotal} XP`);
  if (streakDays != null && streakDays > 0) {
    secondaryParts.push(`${streakDays} day streak`);
  }

  const phase = inferQuestPostPackPhaseFromNextAction(verdict.nextAction.label);
  const practiceFirst = phase === "practice_to_green";
  const lockRankNext = phase === "quest_to_verify";
  const choices = buildQuestPostPackChoices(grid, packSkillNodeIds, masteryHighlight);

  const recommendedNodeId = choices?.otherTopic
    ? grid.units
        .flatMap((unit) => unit.nodes)
        .find((node) => node.nodeName === choices.otherTopic?.nodeName)?.id
    : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-12 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className={mentrixStudent.sectionEyebrow}>Pack complete</p>
        <h2 className={`mt-2 ${mentrixStudent.cardTitle} sm:text-2xl`}>
          Pick your next move on the skill tree
        </h2>
        <p className={`mt-2 max-w-xl text-sm leading-relaxed ${mentrixStudent.textMutedOnDark}`}>
          Focus shows what you just worked. Rerun that topic or shift to another square.
        </p>
      </header>

      {choices ? (
        <section className="mb-6 grid gap-3 sm:grid-cols-2" aria-label="Quest next moves">
          <PostPackChoiceCard eyebrow="Same topic" choice={choices.sameTopic} primary />
          {choices.otherTopic ? (
            <PostPackChoiceCard eyebrow="Different topic" choice={choices.otherTopic} />
          ) : (
            <div className="rounded-xl border border-[#334155] bg-[#0f172a]/40 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6366F1]">
                Different topic
              </p>
              <p className="mt-2 text-sm text-slate-400">
                No other open square right now. Run another pack on the same skill or open the full grid.
              </p>
              <Button className="mt-3" variant="outline" asChild>
                <Link href="/student/mastery">Open mastery grid</Link>
              </Button>
            </div>
          )}
        </section>
      ) : null}

      <MasteryGrid
        data={grid}
        hideNextAction
        showLegend
        highlightTransition={highlightTransition}
        pinnedNodeIds={packSkillNodeIds.length > 0 ? packSkillNodeIds : undefined}
        recommendedNodeId={recommendedNodeId}
        remainderCollapsed={packSkillNodeIds.length > 0}
      />

      <p className="mt-3 text-xs text-slate-500">
        Solid indigo ring: this pack. Dashed violet ring: suggested next topic.
        Green at {SOLID_PRACTICE_PERCENT}%+ means practice-owned. Gold means rank locked.
      </p>

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
            Verdict
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

        <h3 className="mt-4 text-lg font-semibold leading-snug text-white sm:text-xl">
          {verdict.changed}
        </h3>
        {verdict.reason ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{verdict.reason}</p>
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
        <Button className="min-h-11 flex-1" variant="outline" onClick={onNewPack}>
          New mixed pack
        </Button>
        <Button className="min-h-11 flex-1" variant="outline" asChild>
          <Link href="/student/mastery">Full skill tree</Link>
        </Button>
        <Button className="min-h-11 flex-1" variant="ghost" asChild>
          <Link href="/student">Home</Link>
        </Button>
      </div>
    </div>
  );
}

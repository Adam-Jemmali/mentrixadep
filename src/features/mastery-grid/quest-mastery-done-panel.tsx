"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type {
  MasteryGridData,
  QuestMasteryHighlight,
  QuestOpenedHighlight,
  QuestPhoenixHighlight,
  QuestFasterHighlight,
} from "@/features/mastery-grid/types";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import { VerdictPanel } from "@/features/guidance/verdict-panel";
import { buildQuestPostPackCtas } from "@/features/quest/quest-post-step-pure";
import { peerTopPercent } from "@/features/xp/rank-statistics-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import {
  QuestPackCompleteLetter,
  letterInteractiveProps,
} from "@/features/mastery-grid/quest-pack-complete-letter";

function primaryCtaIcon(label: string): VocabIconName {
  const lower = label.toLowerCase();
  if (lower.includes("quest")) return "quest";
  if (lower.includes("retest")) return "retest";
  if (lower.includes("home")) return "home";
  if (lower.includes("skill")) return "mastery-grid";
  return "practice-pack";
}

function IconChip({
  name,
  title,
  tone,
}: {
  name: VocabIconName;
  title: string;
  tone: "violet" | "indigo" | "gold" | "whiteOnViolet" | "ghost";
}) {
  const toneClass =
    tone === "violet"
      ? "border-[#7C3AED] bg-[#EDE9FE]"
      : tone === "indigo"
        ? "border-[#6366F1] bg-[#EEF2FF]"
        : tone === "gold"
          ? "border-[#D4A017] bg-[#FFF8E7]"
          : tone === "whiteOnViolet"
            ? "border-white/40 bg-white/15"
            : "border-[#A5B4FC] bg-white";

  const surface = tone === "whiteOnViolet" ? "dark" : "light";

  return (
    <span
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md border ${toneClass}`}
      aria-hidden
    >
      <MentrixaVocabIcon
        name={name}
        size={18}
        surface={surface}
        gold={tone === "gold"}
        title={title}
      />
    </span>
  );
}

export function QuestMasteryDonePanel({
  grid,
  verdict,
  masteryHighlight,
  openedHighlight,
  phoenixHighlight,
  fasterHighlight,
  packSkillNodeIds = [],
  correct,
  total,
  xpAwarded,
  perfectBonus,
}: {
  grid: MasteryGridData;
  verdict: Verdict;
  masteryHighlight?: QuestMasteryHighlight | null;
  openedHighlight?: QuestOpenedHighlight | null;
  phoenixHighlight?: QuestPhoenixHighlight | null;
  fasterHighlight?: QuestFasterHighlight | null;
  packSkillNodeIds?: string[];
  correct: number;
  total: number;
  xpAwarded: number;
  perfectBonus: number;
}) {
  const xpTotal = xpAwarded + perfectBonus + (phoenixHighlight?.xpAwarded ?? 0);
  const questAccuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const percentile = verdict.rankDelta?.percentile?.current;
  const workedNodeName =
    masteryHighlight?.nodeName ??
    grid.units
      .flatMap((unit) => unit.nodes)
      .find((node) => packSkillNodeIds.includes(node.id))?.nodeName ??
    "AP Calculus AB";

  const ctas = buildQuestPostPackCtas(verdict, openedHighlight?.nodeId);
  const interactive = letterInteractiveProps();

  return (
    <QuestPackCompleteLetter>
      <header className="text-center">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#6366F1] bg-[#EDE9FE] px-3 py-1">
            <IconChip name="quest" title="Pack complete" tone="violet" />
            <p className={mentrixStudent.sectionEyebrow}>Pack complete</p>
          </span>
        </div>
        <p className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#0B1220]">
          <IconChip name="skills" title="Worked on" tone="indigo" />
          <span>Worked on: {workedNodeName}</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 font-mono text-xs tabular-nums text-[#475569]">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#A5B4FC] bg-white/90 px-2 py-1">
            <IconChip name="focus-ring" title="Quest accuracy" tone="indigo" />
            {questAccuracy}% quest accuracy
          </span>
          {percentile != null ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#D4A017]/70 bg-[#FFF8E7] px-2 py-1 text-[#92400E]">
              <IconChip name="verified" title="Verified percentile" tone="gold" />
              Top {peerTopPercent(percentile)}% verified
            </span>
          ) : null}
          {xpTotal > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#6366F1] bg-[#EEF2FF] px-2 py-1 text-[#4F46E5]">
              <IconChip name="xp" title="XP awarded" tone="violet" />
              +{xpTotal} XP
            </span>
          ) : null}
        </div>
      </header>

      <div className="mt-7 text-left">
        {openedHighlight ? (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#6366F1] bg-[#EEF2FF] px-3 py-2.5 text-[#0B1220]">
            <IconChip
              name={openedHighlight.icon}
              title={openedHighlight.text}
              tone="indigo"
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#4F46E5]">
                {openedHighlight.text}
              </p>
              <p className="text-sm font-semibold">{openedHighlight.nodeName}</p>
            </div>
          </div>
        ) : null}
        {phoenixHighlight ? (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#6366F1] bg-[#EEF2FF] px-3 py-2.5 text-[#0B1220] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
            <IconChip
              name={phoenixHighlight.icon}
              title={phoenixHighlight.text}
              tone="indigo"
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#4F46E5]">
                {phoenixHighlight.text}
              </p>
              <p className="text-sm font-semibold">{phoenixHighlight.nodeName}</p>
            </div>
          </div>
        ) : null}
        {fasterHighlight ? (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#6366F1] bg-[#EEF2FF] px-3 py-2.5 text-[#0B1220] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
            <IconChip
              name={fasterHighlight.icon}
              title={fasterHighlight.text}
              tone="indigo"
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#4F46E5]">
                {fasterHighlight.text}
              </p>
              <p className="text-sm font-semibold">{fasterHighlight.nodeName}</p>
            </div>
          </div>
        ) : null}
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
                <Link
                  href={cta.href}
                  className="inline-flex w-full items-center justify-center gap-2 whitespace-normal px-3 text-center text-sm leading-snug"
                  {...interactive}
                >
                  <IconChip
                    name={primaryCtaIcon(cta.label)}
                    title={cta.label}
                    tone="whiteOnViolet"
                  />
                  <span className="min-w-0 flex-1 text-balance">{cta.label}</span>
                </Link>
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
                <Link
                  href={cta.href}
                  className="inline-flex w-full items-center justify-center gap-2 whitespace-normal px-3 text-center text-sm leading-snug"
                  {...interactive}
                >
                  <IconChip name="mastery-grid" title="Skill tree" tone="indigo" />
                  <span className="min-w-0 flex-1 text-balance">{cta.label}</span>
                </Link>
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
              <Link
                href={cta.href}
                className="inline-flex items-center justify-center gap-2"
                {...interactive}
              >
                <IconChip name="home" title="Home" tone="ghost" />
                {cta.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </QuestPackCompleteLetter>
  );
}

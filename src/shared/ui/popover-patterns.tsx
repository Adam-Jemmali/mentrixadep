"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover } from "@/shared/ui/hero-popover";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";
import { BookingPriceBreakdown } from "@/features/booking/booking-price-breakdown";
import { splitSessionPriceCents } from "@/features/booking/booking-pricing";
import type { MasteryGridNode } from "@/features/mastery-grid/types";
import {
  buildMasteryNodeDetailRows,
  buildMasteryNodeDetailVerdict,
  isMasteryNodePracticeLocked,
  masteryNodeActionHref,
  masteryNodeActionLabel,
  masteryNodeShortStateLabel,
} from "@/features/mastery-grid/mastery-node-detail-pure";
import {
  masteryNodeDetailStateLabel,
  priceBreakdownPopoverMessage,
  rankBreakdownPopoverMessage,
  rankBreakdownPopoverRows,
  type MentrixaPopoverMessage,
} from "@/shared/ui/popover-messages-pure";
import type { VerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";
import {
  MentrixaBrandMark,
  type MentrixaBrandKind,
} from "@/shared/ui/mentrixa-ui-brand";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { SkillConceptIcon } from "@/features/quest/ui/skill-concept-icon";
import { VisualPercentBar } from "@/shared/ui/visual-metric-patterns";
import { RANK_PROOFS_LABEL } from "@/features/xp/rank-proofs-labels";

export type MentrixaPopoverTone = "light" | "dark" | "workbench";

const TONE_CLASS: Record<MentrixaPopoverTone, string> = {
  light: "mentrixa-popover--light",
  dark: "mentrixa-popover--dark",
  workbench: "mentrixa-popover--workbench",
};

export function MentrixaPopover({
  trigger,
  title,
  children,
  verdict,
  nextAction,
  tone = "light",
  brandKind,
  vocabIcon,
  vocabIconGold = false,
  placement = "bottom",
  className,
  contentClassName,
}: {
  trigger: ReactNode;
  title: string;
  children: ReactNode;
  verdict?: string;
  nextAction?: string;
  tone?: MentrixaPopoverTone;
  brandKind?: MentrixaBrandKind;
  vocabIcon?: VocabIconName;
  vocabIconGold?: boolean;
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Popover>
      <Popover.Trigger className={cn("mentrixa-popover__trigger", className)}>{trigger}</Popover.Trigger>
      <Popover.Content placement={placement} className={cn("mentrixa-popover__content max-w-xs", contentClassName)}>
        <Popover.Dialog className={cn("mentrixa-popover", TONE_CLASS[tone])}>
          <Popover.Arrow className="mentrixa-popover__arrow" />
          <Popover.Heading className="mentrixa-popover__heading flex items-center gap-2">
            {vocabIcon ? (
              <MentrixaVocabIcon
                name={vocabIcon}
                size={16}
                gold={vocabIconGold}
                className={vocabIconGold ? "text-amber-300" : "text-current opacity-85"}
              />
            ) : brandKind ? (
              <MentrixaBrandMark kind={brandKind} size="xs" className="opacity-85" />
            ) : null}
            <span>{title}</span>
          </Popover.Heading>
          <div className="mentrixa-popover__body mt-2 text-sm leading-relaxed">{children}</div>
          {verdict || nextAction ? (
            <p className="mentrixa-popover__footer mt-3 text-xs leading-relaxed">
              {verdict ? <span>{verdict} </span> : null}
              {nextAction ? <span className="opacity-90">{nextAction}</span> : null}
            </p>
          ) : null}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function MentrixaPopoverFromMessage({
  message,
  trigger,
  tone = "light",
  brandKind,
  vocabIcon,
  vocabIconGold = false,
  children,
  placement,
  className,
  contentClassName,
}: {
  message: MentrixaPopoverMessage;
  trigger: ReactNode;
  tone?: MentrixaPopoverTone;
  brandKind?: MentrixaBrandKind;
  vocabIcon?: VocabIconName;
  vocabIconGold?: boolean;
  children: ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
  contentClassName?: string;
}) {
  return (
    <MentrixaPopover
      trigger={trigger}
      title={message.title}
      verdict={message.verdict}
      nextAction={message.nextAction}
      tone={tone}
      brandKind={brandKind}
      vocabIcon={vocabIcon}
      vocabIconGold={vocabIconGold}
      placement={placement}
      className={className}
      contentClassName={contentClassName}
    >
      {children}
    </MentrixaPopover>
  );
}

export function RankBreakdownPopover({
  stats,
  tone = "dark",
  triggerLabel = "Rank breakdown",
  className,
}: {
  stats: VerifiedFirstAttemptRankStats;
  tone?: MentrixaPopoverTone;
  triggerLabel?: string;
  className?: string;
}) {
  const message = rankBreakdownPopoverMessage(stats);
  const rows = rankBreakdownPopoverRows(stats);

  return (
    <MentrixaPopoverFromMessage
      message={message}
      tone={tone}
      brandKind="mentrixer"
      className={className}
      trigger={
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            "h-8 border-white/20 bg-white/5 text-[11px] text-white hover:bg-white/10",
            tone === "light" && "border-indigo-200 text-indigo-800 hover:bg-indigo-50",
          )}
        >
          {triggerLabel}
        </Button>
      }
    >
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
            <dt className="inline-flex items-center gap-1.5 text-inherit opacity-80">
              {row.label === RANK_PROOFS_LABEL ? (
                <MentrixaVocabIcon name="rank-proof" size={14} gold className="text-amber-300" />
              ) : null}
              {row.label}
            </dt>
            <dd className="font-mono font-semibold tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </MentrixaPopoverFromMessage>
  );
}

export function PriceBreakdownPopover({
  sessionPriceCents,
  tone = "dark",
  triggerLabel = "Price breakdown",
  className,
}: {
  sessionPriceCents: number;
  tone?: MentrixaPopoverTone;
  triggerLabel?: string;
  className?: string;
}) {
  const split = splitSessionPriceCents(sessionPriceCents);
  const message = priceBreakdownPopoverMessage(split);

  return (
    <MentrixaPopoverFromMessage
      message={message}
      tone={tone}
      brandKind="mentrixa"
      className={className}
      contentClassName="max-w-sm"
      trigger={
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            "h-8 gap-1.5 border-slate-600 bg-slate-800/50 text-[11px] text-slate-200 hover:bg-slate-800",
            tone === "light" && "border-indigo-200 text-indigo-800 hover:bg-indigo-50",
          )}
        >
          <Info className="size-3.5" aria-hidden />
          {triggerLabel}
        </Button>
      }
    >
      <BookingPriceBreakdown sessionPriceCents={sessionPriceCents} />
    </MentrixaPopoverFromMessage>
  );
}

export function MasteryNodeDetailPopover({
  node,
  globalTopPercent,
  globalVerifiedCount,
  unitNumber,
  unlockedNodeIds,
  children,
  tone = "dark",
  placement = "top",
  className,
}: {
  node: MasteryGridNode;
  globalTopPercent?: number | null;
  globalVerifiedCount?: number;
  unitNumber?: number;
  unlockedNodeIds?: ReadonlySet<string> | null;
  children: ReactNode;
  tone?: MentrixaPopoverTone;
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const { nodeName, nodeSlug, state, accuracyPercent } = node;
  const rows = buildMasteryNodeDetailRows(node, globalTopPercent, globalVerifiedCount);
  const locked = isMasteryNodePracticeLocked(node.id, unlockedNodeIds);
  const verdict = locked
    ? "Locked. Open prior skill."
    : buildMasteryNodeDetailVerdict(node);
  const actionHref = masteryNodeActionHref(node);
  const actionLabel = masteryNodeActionLabel(node);
  const meterValue =
    state === "verified" ? 100 : Math.min(100, Math.max(0, accuracyPercent ?? 0));

  const headerIcon: VocabIconName = locked
    ? "skills"
    : state === "verified"
      ? "verified"
      : "practice-pack";
  const surface = tone === "dark" ? "dark" : "light";

  return (
    <MentrixaPopover
      trigger={<span className="block min-w-0 w-full cursor-pointer">{children}</span>}
      title={nodeName}
      verdict={verdict}
      tone={tone}
      vocabIcon={headerIcon}
      vocabIconGold={!locked && state === "verified"}
      placement={placement}
      className={className}
    >
      <div className="flex items-center gap-3">
        <SkillConceptIcon
          nodeName={nodeName}
          nodeSlug={nodeSlug}
          unitNumber={unitNumber}
          size={36}
          surface={tone === "dark" ? "onDark" : "onLight"}
          title={nodeName}
        />
        <div className="inline-flex items-center gap-2">
          <MentrixaVocabIcon
            name={headerIcon}
            size={22}
            gold={state === "verified"}
            surface={surface}
            title={masteryNodeDetailStateLabel(state)}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.12em]">
            {masteryNodeShortStateLabel(state)}
          </span>
        </div>
      </div>

      <VisualPercentBar
        className="mt-3"
        value={meterValue}
        icon={state === "verified" ? "verified" : "practice-pack"}
        label={state === "verified" ? "First answer" : "Practice"}
        gold={state === "verified"}
        surface={surface}
      />

      <dl
        className={cn(
          "mt-3 space-y-2 border-t pt-3",
          tone === "dark" ? "border-white/10" : "border-slate-200",
        )}
      >
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 text-xs">
            <dt className="opacity-80">{row.label}</dt>
            <dd
              className={cn(
                "max-w-[11rem] text-right font-mono font-semibold tabular-nums leading-snug",
                row.gold && "text-[#D4A017]",
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {locked ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-4 w-full cursor-not-allowed opacity-70"
          disabled
        >
          <span className="inline-flex items-center gap-2">
            <MentrixaVocabIcon name="skills" size={18} surface={surface} title="Locked" />
            <span>Locked</span>
          </span>
        </Button>
      ) : (
        <Button
          asChild
          size="sm"
          variant={state === "proficient" ? "workbenchPrimary" : "outline"}
          className="mt-4 w-full"
        >
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </MentrixaPopover>
  );
}

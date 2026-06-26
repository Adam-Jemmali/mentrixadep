"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover } from "@/shared/ui/hero-popover";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";
import { BookingPriceBreakdown } from "@/features/booking/booking-price-breakdown";
import { splitSessionPriceCents } from "@/features/booking/booking-pricing";
import type { MasteryNodeState } from "@/features/mastery-grid/types";
import {
  MentrixaBrandMark,
  type MentrixaBrandKind,
} from "@/shared/ui/mentrixa-ui-brand";
import {
  masteryNodeDetailPopoverMessage,
  masteryNodeDetailStateLabel,
  priceBreakdownPopoverMessage,
  rankBreakdownPopoverMessage,
  rankBreakdownPopoverRows,
  type MentrixaPopoverMessage,
} from "@/shared/ui/popover-messages-pure";
import type { VerifiedFirstAttemptRankStats } from "@/features/xp/calibrated-rank";

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
            {brandKind ? <MentrixaBrandMark kind={brandKind} size="xs" className="opacity-85" /> : null}
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
  children,
  placement,
  className,
  contentClassName,
}: {
  message: MentrixaPopoverMessage;
  trigger: ReactNode;
  tone?: MentrixaPopoverTone;
  brandKind?: MentrixaBrandKind;
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
            <dt className="text-inherit opacity-80">{row.label}</dt>
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
  nodeName,
  state,
  accuracyPercent,
  children,
  tone = "dark",
  placement = "top",
  className,
}: {
  nodeName: string;
  state: MasteryNodeState;
  accuracyPercent: number | null;
  children: ReactNode;
  tone?: MentrixaPopoverTone;
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const message = masteryNodeDetailPopoverMessage(nodeName, state, accuracyPercent);

  return (
    <MentrixaPopoverFromMessage
      message={message}
      tone={tone}
      brandKind="mentrixer"
      placement={placement}
      className={className}
      trigger={<span className="block min-w-0 w-full cursor-pointer">{children}</span>}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">
        {masteryNodeDetailStateLabel(state)}
      </p>
      {accuracyPercent != null ? (
        <p className="mt-2 font-mono text-sm tabular-nums">{accuracyPercent}% practice accuracy</p>
      ) : (
        <p className="mt-2 text-xs opacity-80">No practice attempts recorded yet.</p>
      )}
    </MentrixaPopoverFromMessage>
  );
}

"use client";

import type { CSSProperties, ReactNode } from "react";
import type { MasteryNodeState } from "@/features/mastery-grid/types";
import { cn } from "@/shared/core/utils";
import { Tooltip } from "@/shared/ui/tooltip";
import {
  MentrixaTooltipBrandHeader,
  type MentrixaBrandKind,
} from "@/shared/ui/mentrixa-ui-brand";
import { MentrixaMetaTag } from "@/shared/ui/meta-tag-patterns";

export type TooltipTone = "light" | "dark";

const CONTENT_CLASS: Record<TooltipTone, string> = {
  light: "border border-slate-200 bg-white text-slate-800 shadow-lg",
  dark: "border border-white/10 bg-[#0F172A] text-slate-100 shadow-lg",
};

const ARROW_FILL: Record<TooltipTone, string> = {
  light: "#ffffff",
  dark: "#0f172a",
};

export function formatMasteryNodeTooltip(
  nodeName: string,
  state: MasteryNodeState,
  accuracyPercent: number | null,
): string {
  if (accuracyPercent == null) return `${nodeName}: not attempted`;
  if (state === "verified") return `${nodeName}: locked first answer`;
  return `${nodeName}: ${accuracyPercent}%`;
}

export function MentrixaTooltip({
  content,
  children,
  tone = "dark",
  placement = "top",
  delay = 250,
  triggerClassName,
  contentClassName,
  brandKind,
}: {
  content: ReactNode;
  children: ReactNode;
  tone?: TooltipTone;
  placement?: "top" | "bottom" | "left" | "right";
  delay?: number;
  triggerClassName?: string;
  contentClassName?: string;
  brandKind?: MentrixaBrandKind;
}) {
  const body = brandKind ? (
    <>
      <MentrixaTooltipBrandHeader kind={brandKind} tone={tone} />
      {content}
    </>
  ) : (
    content
  );

  return (
    <Tooltip delay={delay} closeDelay={100}>
      <Tooltip.Trigger className={cn("tooltip__trigger", triggerClassName)}>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Content
        placement={placement}
        showArrow
        className={cn(
          "tooltip max-w-xs px-2.5 py-2 text-xs leading-snug",
          CONTENT_CLASS[tone],
          contentClassName,
        )}
        style={{ "--tooltip-arrow-fill": ARROW_FILL[tone] } as CSSProperties}
      >
        <Tooltip.Arrow />
        {body}
      </Tooltip.Content>
    </Tooltip>
  );
}

export function ExamStakesLabel({
  examStakes,
  tone = "dark",
  className,
}: {
  examStakes: string;
  tone?: TooltipTone;
  className?: string;
}) {
  const text = examStakes.trim();
  if (!text) return null;

  return (
    <MentrixaTooltip
      tone={tone}
      placement="bottom"
      content={<p className="max-w-[18rem] leading-relaxed">{text}</p>}
      contentClassName="max-w-sm"
    >
      <span className="inline-flex cursor-help">
        <MentrixaMetaTag variant="exam_stakes" tone={tone} className={className}>
          Exam stakes
        </MentrixaMetaTag>
      </span>
    </MentrixaTooltip>
  );
}

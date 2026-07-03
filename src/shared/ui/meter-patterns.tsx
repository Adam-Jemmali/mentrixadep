"use client";

import type { CSSProperties } from "react";
import { VERIFIED_GOLD } from "@/features/mastery-grid/mastery-grid-pure";
import type { MasteryNodeState } from "@/features/mastery-grid/types";
import { SkillConceptIcon } from "@/features/quest/ui/skill-concept-icon";
import { cn } from "@/shared/core/utils";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { Meter } from "@/shared/ui/meter";

export type MeterTone = "light" | "dark";

const STATE_WORD: Record<MasteryNodeState, string> = {
  none: "Open",
  weak: "Weak",
  proficient: "Proficient",
  verified: "Verified",
};

const STATE_ICON: Record<MasteryNodeState, VocabIconName> = {
  none: "focus-ring",
  weak: "practice-pack",
  proficient: "practice-pack",
  verified: "verified",
};

const STATE_LABEL: Record<MasteryNodeState, string> = {
  none: "Not started",
  weak: "Under 70%",
  proficient: "70% or higher",
  verified: "Verified",
};

export function skillNodeMeterValue(
  state: MasteryNodeState,
  accuracyPercent: number | null,
): number {
  if (state === "none") return 0;
  if (state === "verified") return 100;
  return Math.min(100, Math.max(0, accuracyPercent ?? 0));
}

export function skillNodeMeterColor(
  state: MasteryNodeState,
): "default" | "accent" | "success" | "warning" | "danger" {
  if (state === "verified") return "warning";
  if (state === "proficient") return "success";
  if (state === "weak") return "warning";
  return "default";
}

export function skillNodeMeterFillStyle(state: MasteryNodeState): CSSProperties | undefined {
  if (state === "verified") {
    return { backgroundColor: VERIFIED_GOLD };
  }
  return undefined;
}

export function SkillNodeStrengthMeter({
  nodeName,
  nodeSlug,
  unitNumber,
  state,
  accuracyPercent,
  size = "sm",
  tone = "dark",
  showLabel = true,
  className,
}: {
  nodeName: string;
  nodeSlug?: string;
  unitNumber?: number;
  state: MasteryNodeState;
  accuracyPercent: number | null;
  size?: "sm" | "md" | "lg";
  tone?: MeterTone;
  showLabel?: boolean;
  className?: string;
}) {
  const value = skillNodeMeterValue(state, accuracyPercent);
  const color = skillNodeMeterColor(state);
  const isDark = tone === "dark";
  const statusLabel = STATE_LABEL[state];
  const stateWord = STATE_WORD[state];
  const ariaLabel =
    accuracyPercent == null
      ? `${nodeName}: ${statusLabel.toLowerCase()}`
      : `${nodeName}: ${accuracyPercent}% (${statusLabel.toLowerCase()})`;

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <SkillConceptIcon
        nodeName={nodeName}
        nodeSlug={nodeSlug}
        unitNumber={unitNumber}
        size={size === "lg" ? 40 : size === "md" ? 36 : 32}
        surface={isDark ? "onDark" : "onLight"}
        title={nodeName}
      />
      <div className="min-w-0 flex-1 space-y-1">
        {showLabel ? (
          <p
            className={cn(
              "line-clamp-2 text-[11px] font-semibold leading-snug",
              isDark ? "text-violet-50" : "text-zinc-900",
            )}
            title={nodeName}
          >
            {nodeName}
          </p>
        ) : null}
        <Meter
          aria-label={ariaLabel}
          value={value}
          minValue={0}
          maxValue={100}
          size={size}
          color={color}
          data-meter-tone={tone}
          className="gap-1"
        >
          <span
            style={{ gridArea: "label" }}
            className="inline-flex min-w-0 items-center gap-1.5"
          >
            <MentrixaVocabIcon
              name={STATE_ICON[state]}
              size={18}
              gold={state === "verified"}
              surface={isDark ? "dark" : "light"}
              title={stateWord}
            />
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.12em]",
                isDark ? "text-indigo-200/90" : "text-slate-600",
              )}
            >
              {stateWord}
            </span>
          </span>
          <Meter.Output
            className={cn(
              "text-[10px] font-bold tabular-nums",
              isDark ? "text-slate-300" : "text-slate-700",
              state === "verified" && "text-[#D4A017]",
            )}
          />
          <Meter.Track
            className={cn(
              "rounded-full",
              isDark ? "bg-white/10" : "bg-violet-100",
            )}
          >
            <Meter.Fill className="rounded-full" style={skillNodeMeterFillStyle(state)} />
          </Meter.Track>
        </Meter>
      </div>
    </div>
  );
}

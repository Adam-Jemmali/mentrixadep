"use client";

import type { CSSProperties } from "react";
import { VERIFIED_GOLD } from "@/features/mastery-grid/mastery-grid-pure";
import type { MasteryNodeState } from "@/features/mastery-grid/types";
import { cn } from "@/shared/core/utils";
import { Meter } from "@/shared/ui/meter";
import { MentrixaBrandMark } from "@/shared/ui/mentrixa-ui-brand";

export type MeterTone = "light" | "dark";

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
  state,
  accuracyPercent,
  size = "sm",
  tone = "dark",
  showLabel = true,
  className,
}: {
  nodeName: string;
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
  const ariaLabel =
    accuracyPercent == null
      ? `${nodeName}: ${statusLabel.toLowerCase()}`
      : `${nodeName}: ${accuracyPercent}% (${statusLabel.toLowerCase()})`;

  return (
    <Meter
      aria-label={ariaLabel}
      value={value}
      minValue={0}
      maxValue={100}
      size={size}
      color={color}
      data-meter-tone={tone}
      className={cn("gap-1", className)}
    >
      {showLabel ? (
        <span
          style={{ gridArea: "label" }}
          className={cn(
            "inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-[0.08em]",
            isDark ? "text-indigo-200/90" : "text-slate-600",
          )}
          title={nodeName}
        >
          <MentrixaBrandMark
            kind={state === "verified" ? "mentrixer" : "mentrixa"}
            size="xs"
            className={state === "verified" ? "text-[#D4A017]" : undefined}
          />
          <span className="truncate">{nodeName}</span>
        </span>
      ) : null}
      <Meter.Output
        className={cn(
          "text-[10px] font-semibold tabular-nums",
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
  );
}

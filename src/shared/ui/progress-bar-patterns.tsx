"use client";

import type { CSSProperties } from "react";
import { cn } from "@/shared/core/utils";
import { ProgressBar } from "@/shared/ui/progress-bar";
import { MentrixaBrandLabel, MentrixaBrandMark } from "@/shared/ui/mentrixa-ui-brand";

export type ProgressTone = "light" | "dark";

export function QuestSessionProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <MentrixaBrandMark kind="mentrixa" size="xs" className="opacity-80" />
      <ProgressBar
        aria-label="Quest session progress"
        value={clamped}
        minValue={0}
        maxValue={100}
        size="sm"
        color="accent"
        className="min-w-0 flex-1 gap-0"
      >
        <ProgressBar.Track className="h-2 rounded-full bg-violet-100">
          <ProgressBar.Fill className="rounded-full bg-indigo-600" />
        </ProgressBar.Track>
      </ProgressBar>
    </div>
  );
}

export function QuestSessionProgressIndeterminate({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <MentrixaBrandMark kind="mentrixa" size="xs" className="opacity-80" />
      <ProgressBar
        isIndeterminate
        aria-label="Loading quest pack"
        size="sm"
        color="accent"
        className="min-w-0 flex-1 gap-0"
      >
        <ProgressBar.Track className="h-2 rounded-full bg-violet-100">
          <ProgressBar.Fill className="rounded-full bg-indigo-600" />
        </ProgressBar.Track>
      </ProgressBar>
    </div>
  );
}

export function XpTierProgressBar({
  value,
  tone = "light",
  label = "Rank progress",
  showHeader = true,
  fillStyle,
  className,
}: {
  value: number;
  tone?: ProgressTone;
  label?: string;
  /** When false, render only the track (parent supplies the metric label). */
  showHeader?: boolean;
  fillStyle?: CSSProperties;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const isDark = tone === "dark";

  return (
    <div className={cn("w-full", className)}>
      {showHeader ? (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span
            className={cn(
              "min-w-0 text-[10px] font-semibold uppercase tracking-wide",
              isDark ? "text-zinc-400" : "text-zinc-500",
            )}
          >
            <MentrixaBrandLabel kind="mentrixer" label={label} />
          </span>
          <span
            className={cn(
              "shrink-0 text-xs font-bold tabular-nums leading-none",
              isDark ? "text-violet-100" : "text-zinc-700",
            )}
            aria-hidden
          >
            {clamped}%
          </span>
        </div>
      ) : null}
      <ProgressBar
        aria-label={`${label}: ${clamped}%`}
        value={clamped}
        minValue={0}
        maxValue={100}
        size="sm"
        color="accent"
        data-progress-tone={tone}
        className="progress-bar--track-only gap-0"
      >
        <ProgressBar.Output className="sr-only" />
        <ProgressBar.Track
          className={cn(
            "h-2 rounded-full",
            isDark ? "bg-white/10" : "bg-violet-100",
          )}
        >
          <ProgressBar.Fill className="rounded-full" style={fillStyle} />
        </ProgressBar.Track>
      </ProgressBar>
    </div>
  );
}

export function OnboardingStepsProgressBar({
  currentStep,
  totalSteps,
  tone = "light",
  className,
}: {
  /** 1-based step index */
  currentStep: number;
  totalSteps: number;
  tone?: ProgressTone;
  className?: string;
}) {
  const safeTotal = Math.max(1, totalSteps);
  const safeStep = Math.min(safeTotal, Math.max(1, currentStep));
  const value = Math.round((safeStep / safeTotal) * 100);
  const isDark = tone === "dark";

  return (
    <ProgressBar
      aria-label={`Onboarding step ${safeStep} of ${safeTotal}`}
      value={value}
      minValue={0}
      maxValue={100}
      size="sm"
      color="accent"
      data-progress-tone={tone}
      className={cn("gap-1", className)}
    >
      <span
        style={{ gridArea: "label" }}
        className={cn(
          "text-[10px] font-bold uppercase tracking-[0.14em]",
          isDark ? "text-indigo-200/90" : "text-indigo-600",
        )}
      >
        <MentrixaBrandLabel
          kind="mentrixa"
          label={`Step ${safeStep}/${safeTotal}`}
        />
      </span>
      <ProgressBar.Output className="sr-only" />
      <ProgressBar.Track
        className={cn(
          "h-1.5 rounded-full",
          isDark ? "bg-white/10" : "bg-indigo-100",
        )}
      >
        <ProgressBar.Fill className="rounded-full bg-indigo-600" />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

export type OnboardingQuestPhase = "wizard" | "run" | "done";

/** First-quest flow: setup → five verified attempts → results. */
export function onboardingQuestProgressPercent(
  phase: OnboardingQuestPhase,
  questionIndex = 0,
  questionTotal = 5,
): number {
  if (phase === "wizard") return 12;
  if (phase === "done") return 100;
  const total = Math.max(1, questionTotal);
  const index = Math.min(total, Math.max(1, questionIndex + 1));
  return Math.round(12 + (index / total) * 76);
}

export function OnboardingQuestProgressBar({
  phase,
  questionIndex = 0,
  questionTotal = 5,
  className,
}: {
  phase: OnboardingQuestPhase;
  questionIndex?: number;
  questionTotal?: number;
  className?: string;
}) {
  const value = onboardingQuestProgressPercent(phase, questionIndex, questionTotal);

  return (
    <div className={className}>
      <QuestSessionProgressBar value={value} />
      <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-500">
        <MentrixaBrandMark kind="mentrixa" size="xs" className="opacity-75" />
        {phase === "wizard"
          ? "Prepare your first quest"
          : phase === "done"
            ? "First quest complete"
            : `Verified attempt ${questionIndex + 1} of ${questionTotal}`}
      </p>
    </div>
  );
}

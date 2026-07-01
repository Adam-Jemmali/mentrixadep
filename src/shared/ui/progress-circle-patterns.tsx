"use client";

import type { ReactNode } from "react";
import { MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE } from "@/features/xp/calibrated-rank";
import { RANK_PROOFS_LABEL } from "@/features/xp/rank-proofs-labels";
import { cn } from "@/shared/core/utils";
import { ProgressCircle } from "@/shared/ui/progress-circle";
import { MentrixaBrandMark } from "@/shared/ui/mentrixa-ui-brand";

const VERIFIED_GOLD = "#D4A017";

function ProgressCircleFrame({
  children,
  center,
  centerClassName,
  className,
}: {
  children: ReactNode;
  center?: ReactNode;
  centerClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      {children}
      {center != null ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center text-center",
            centerClassName,
          )}
        >
          {center}
        </span>
      ) : null}
    </div>
  );
}

function formatQuestTimer(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function QuestTimerProgressCircle({
  timeLeftSec,
  timeLimitSec,
  size = "lg",
  className,
}: {
  timeLeftSec: number;
  timeLimitSec: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const limit = Math.max(1, timeLimitSec);
  const remaining = Math.min(limit, Math.max(0, timeLeftSec));
  const value = Math.round((remaining / limit) * 100);
  const urgent = remaining > 0 && remaining < 120;

  return (
    <ProgressCircleFrame
      className={className}
      center={
        <span className="flex flex-col items-center gap-0.5">
          <span className={cn(
            "font-mono text-[10px] font-semibold tabular-nums sm:text-xs",
            urgent ? "text-red-600" : "text-slate-700",
          )}>
            {formatQuestTimer(remaining)}
          </span>
          <MentrixaBrandMark kind="mentrixa" size="xs" className="opacity-70" />
        </span>
      }
    >
      <ProgressCircle
        aria-label={`Quest time remaining: ${formatQuestTimer(remaining)}`}
        value={value}
        minValue={0}
        maxValue={100}
        size={size}
        color={urgent ? "danger" : "accent"}
      >
        <ProgressCircle.Track className="!h-14 !w-14 sm:!h-16 sm:!w-16">
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle />
        </ProgressCircle.Track>
      </ProgressCircle>
    </ProgressCircleFrame>
  );
}

export function VerifiedNodesProgressCircle({
  verifiedCount,
  goalCount = MIN_VERIFIED_ATTEMPTS_FOR_PERCENTILE,
  size = "lg",
  showGoalInCenter = true,
  className,
}: {
  verifiedCount: number;
  goalCount?: number;
  size?: "sm" | "md" | "lg";
  showGoalInCenter?: boolean;
  className?: string;
}) {
  const goal = Math.max(1, goalCount);
  const count = Math.max(0, verifiedCount);
  const value = Math.min(100, Math.round((count / goal) * 100));
  const unlocked = count >= goal;

  return (
    <ProgressCircleFrame
      className={className}
      center={
        showGoalInCenter ? (
          <>
            <MentrixaBrandMark
              kind="mentrixer"
              size="xs"
              className={cn("mb-0.5", unlocked && "text-[#D4A017]")}
            />
            <span className="block font-mono text-sm font-black tabular-nums leading-none">{count}</span>
            <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              of {goal}
            </span>
          </>
        ) : (
          <>
            <MentrixaBrandMark kind="mentrixer" size="xs" className="mb-0.5" />
            <span className="font-mono text-sm font-black tabular-nums">{count}</span>
          </>
        )
      }
      centerClassName="flex-col"
    >
      <ProgressCircle
        aria-label={`${count} of ${goal} ${RANK_PROOFS_LABEL.toLowerCase()} recorded`}
        value={value}
        minValue={0}
        maxValue={100}
        size={size}
        color="accent"
      >
        <ProgressCircle.Track className="!h-16 !w-16 sm:!h-[4.5rem] sm:!w-[4.5rem]">
          <ProgressCircle.TrackCircle />
          <ProgressCircle.FillCircle
            style={unlocked ? { stroke: VERIFIED_GOLD } : undefined}
          />
        </ProgressCircle.Track>
      </ProgressCircle>
    </ProgressCircleFrame>
  );
}

export function QuestTimerProgressIndeterminate({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <ProgressCircleFrame
      className={className}
      center={<MentrixaBrandMark kind="mentrixa" size="sm" className="opacity-80" />}
    >
      <ProgressCircle isIndeterminate aria-label="Loading quest timer" size={size}>
      <ProgressCircle.Track>
        <ProgressCircle.TrackCircle />
        <ProgressCircle.FillCircle />
      </ProgressCircle.Track>
      </ProgressCircle>
    </ProgressCircleFrame>
  );
}

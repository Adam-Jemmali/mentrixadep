"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/core/utils";

export type UiSkeletonShimmerProps = {
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
};

/**
 * Navy shimmer block. Gradient navy/20 → navy/40 per Mentrixa loading spec.
 */
export function UiSkeletonShimmer({ className, children, "aria-label": ariaLabel }: UiSkeletonShimmerProps) {
  return (
    <div
      aria-busy="true"
      aria-label={ariaLabel ?? "Loading"}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-node)]",
        "bg-[rgba(11,18,32,0.2)]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-[linear-gradient(90deg,transparent,rgba(11,18,32,0.4),transparent)]",
        "motion-reduce:before:animate-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function UiSkeletonShimmerGrid({
  count = 6,
  className,
  itemClassName,
}: {
  count?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <UiSkeletonShimmer
          key={index}
          className={cn("h-8 w-full min-w-[4rem] flex-1", itemClassName)}
          aria-label={index === 0 ? "Loading" : undefined}
        />
      ))}
    </div>
  );
}

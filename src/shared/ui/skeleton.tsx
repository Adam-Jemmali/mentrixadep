"use client";

import { Skeleton as HeroSkeleton } from "@heroui/react";
import type { SkeletonRootProps } from "@heroui/react";
import { cn } from "@/shared/core/utils";

export type SkeletonTone = "light" | "dark";

export type SkeletonAnimation = NonNullable<SkeletonRootProps["animationType"]>;

export type SkeletonProps = SkeletonRootProps & {
  /**
   * Surface the placeholder sits on.
   * `light` — white / slate-50 cards (default).
   * `dark` — navy shells (`#0B1220`, quest, duel, marketing).
   */
  tone?: SkeletonTone;
};

/**
 * Loading placeholder with shimmer (default), pulse, or no animation.
 *
 * `className` sets size and shape — HeroUI only supplies the animated fill.
 *
 * ```tsx
 * // Full-width form row on a white card
 * <Skeleton className="h-10 w-full rounded-xl" />
 *
 * // Small label chip; pulse is softer than shimmer
 * <Skeleton animationType="pulse" className="h-8 w-32 rounded-lg" />
 *
 * // Block on a dark navy shell
 * <Skeleton tone="dark" className="h-36 rounded-2xl" />
 * ```
 */
export function Skeleton({
  tone = "light",
  className,
  animationType,
  ...props
}: SkeletonProps) {
  return (
    <HeroSkeleton
      animationType={animationType}
      data-skeleton-tone={tone}
      className={cn("block", className)}
      {...props}
    />
  );
}

export type { SkeletonRootProps } from "@heroui/react";

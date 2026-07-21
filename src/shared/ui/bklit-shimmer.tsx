import type { ReactNode } from "react";
import { cn } from "@/shared/core/utils";

export type BklitShimmerProps = {
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
};

/**
 * Bklit-style shimmer block for data-loading moments. No spinners.
 */
export function BklitShimmer({ className, children, "aria-label": ariaLabel }: BklitShimmerProps) {
  return (
    <div
      aria-busy="true"
      aria-label={ariaLabel ?? "Loading"}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-node)] bg-[var(--mx-surface-3)]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BklitShimmerGrid({
  count = 10,
  className,
  itemClassName,
}: {
  count?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <BklitShimmer
          key={index}
          className={cn("h-7 w-7", itemClassName)}
          aria-label={index === 0 ? "Loading mastery nodes" : undefined}
        />
      ))}
    </div>
  );
}

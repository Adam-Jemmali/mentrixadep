"use client";

import type { ReactNode } from "react";
import { BklitShimmer, BklitShimmerGrid } from "@/shared/ui/bklit-shimmer";

export type UiSkeletonShimmerProps = {
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
};

/** Route and section loading — delegates to BklitShimmer. */
export function UiSkeletonShimmer(props: UiSkeletonShimmerProps) {
  return <BklitShimmer {...props} />;
}

export function UiSkeletonShimmerGrid(props: {
  count?: number;
  className?: string;
  itemClassName?: string;
}) {
  return <BklitShimmerGrid {...props} />;
}

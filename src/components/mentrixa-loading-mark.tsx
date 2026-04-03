"use client";

import { MentrixaLogoLoader } from "@/components/mentrixa-logo";
import { cn } from "@/lib/utils";

/** @deprecated Use `MentrixaLogoLoader` — kept for `LoadingSpinner` / `PageLoading`. */
export function MentrixaLoadingMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const mapped = size === "sm" ? "sm" : size === "lg" ? "lg" : "md";
  return <MentrixaLogoLoader size={mapped} className={cn(className)} />;
}

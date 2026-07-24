"use client";

import { BklitShimmer, BklitShimmerGrid } from "@/shared/ui/bklit-shimmer";

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const height = size === "sm" ? "h-8" : size === "lg" ? "h-16" : "h-12";
  return <BklitShimmer className={`${height} w-full max-w-[12rem] rounded-lg`} aria-label="Loading" />;
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12" role="status" aria-label={message}>
      <BklitShimmer className="h-16 w-16 rounded-2xl" aria-label={message} />
      <p className="text-sm text-slate-400/80">{message}</p>
    </div>
  );
}

export function PageLoading() {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[var(--mx-navy)] px-4 py-8 text-white sm:px-6"
      role="status"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <BklitShimmer className="min-h-[55vh] w-full rounded-3xl" aria-label="Loading hero" />
        <BklitShimmerGrid
          count={3}
          className="grid gap-6 sm:grid-cols-3"
          itemClassName="min-h-[12rem] w-full rounded-2xl"
        />
        <BklitShimmer className="min-h-[32vh] w-full rounded-3xl" aria-label="Loading section" />
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { Skeleton, type SkeletonTone } from "@/shared/ui/skeleton";
import { MentrixaBrandMark, MentrixaSkeletonWatermark } from "@/shared/ui/mentrixa-ui-brand";
import { UiSkeletonShimmer, UiSkeletonShimmerGrid } from "@/components/ui";

export type { SkeletonTone };

export function SkeletonFrame({
  tone = "light",
  className,
  children,
  "aria-label": ariaLabel = "Loading content",
}: {
  tone?: SkeletonTone;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <div
      data-skeleton-tone={tone}
      className={className}
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

export function SkeletonTextLines({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["w-full", "w-5/6", "w-4/6", "w-full", "w-3/6"];
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn("h-4 rounded", widths[index % widths.length])} />
      ))}
    </div>
  );
}

export function SkeletonUserProfile({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-36 rounded-lg" />
        <Skeleton className="h-3 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonListItems({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatGrid({
  count = 4,
  className,
  tone = "light",
}: {
  count?: number;
  className?: string;
  tone?: SkeletonTone;
}) {
  if (tone === "dark") {
    return (
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
        {Array.from({ length: count }).map((_, index) => (
          <UiSkeletonShimmer key={index} className="h-[5.5rem] rounded-2xl" aria-label={index === 0 ? "Loading metrics" : undefined} />
        ))}
      </div>
    );
  }
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} tone={tone} className="h-[5.5rem] rounded-2xl" />
      ))}
    </div>
  );
}

export function SkeletonCard({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10", className)}>
      {children ?? <Skeleton className="min-h-[8rem] w-full rounded-xl" />}
    </div>
  );
}

export function StudentDashboardSkeleton() {
  return (
    <SkeletonFrame
      tone="dark"
      className={cn(mentrixStudent.pageBgHub, "space-y-8 p-4 sm:p-6")}
      aria-label="Loading student dashboard"
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <Skeleton tone="dark" className="h-4 w-32 rounded" />
        <Skeleton tone="dark" className="mt-3 h-8 w-64 max-w-full rounded-lg" />
        <Skeleton tone="dark" className="mt-2 h-4 w-full max-w-md rounded" />
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Skeleton tone="dark" className="h-16 w-16 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton tone="dark" className="h-5 w-40 rounded" />
            <Skeleton tone="dark" className="h-4 w-56 max-w-full rounded" />
          </div>
        </div>
      </div>

      <MasteryGridSkeleton />

      <div className="space-y-6">
        <ProgressSnapshotSkeleton />
        <RankLadderSkeleton />
        <SkeletonStatGrid tone="dark" />
      </div>
    </SkeletonFrame>
  );
}

export function QuestWorkspaceSkeleton() {
  return (
    <SkeletonFrame
      tone="dark"
      className="relative mx-auto max-w-4xl space-y-6 px-4 py-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      aria-label="Loading quest workspace"
    >
      <MentrixaSkeletonWatermark kind="mentrixa" />
      <div className="flex items-center gap-2">
        <MentrixaBrandMark kind="mentrixa" size="sm" className="opacity-80" />
        <Skeleton className="h-8 flex-1 max-w-[12rem] rounded-lg" />
      </div>
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </SkeletonFrame>
  );
}

export function DuelHubSkeleton() {
  return (
    <SkeletonFrame
      tone="dark"
      className="mx-auto max-w-5xl space-y-8 px-4 py-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      aria-label="Loading duel hub"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-9 w-56 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-full max-w-md rounded" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <div className="skeleton--shimmer relative grid gap-6 overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} animationType="none" className="h-40 rounded-3xl" />
        ))}
      </div>
    </SkeletonFrame>
  );
}

export function TutorDashboardSkeleton() {
  return (
    <SkeletonFrame
      className="relative mx-auto max-w-7xl space-y-8 px-6 py-8"
      aria-label="Loading tutor dashboard"
    >
      <MentrixaSkeletonWatermark kind="guide" />
      <div className="flex items-center gap-2">
        <MentrixaBrandMark kind="guide" size="sm" />
        <Skeleton className="h-40 flex-1 rounded-2xl" />
      </div>

      <UiSkeletonShimmerGrid count={5} className="grid grid-cols-2 gap-3 sm:grid-cols-5" itemClassName="h-[5.5rem] rounded-2xl" />

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <Skeleton className="min-h-[26rem] rounded-xl" />
        </section>
        <aside className="space-y-6 lg:col-span-4">
          <Skeleton className="min-h-[11rem] rounded-xl" />
          <Skeleton className="min-h-[18rem] rounded-xl" />
          <Skeleton className="min-h-[12rem] rounded-xl" />
        </aside>
      </div>
    </SkeletonFrame>
  );
}

export function MarketingPageSkeleton() {
  return (
    <SkeletonFrame
      tone="dark"
      className="space-y-10 bg-[#070d18] px-4 py-8 sm:px-6"
      aria-label="Loading page"
    >
      <Skeleton className="mx-auto min-h-[70vh] max-w-6xl rounded-3xl" />
      <Skeleton className="mx-auto min-h-[55vh] max-w-6xl rounded-3xl" />
      <Skeleton className="mx-auto min-h-[45vh] max-w-6xl rounded-3xl" />
    </SkeletonFrame>
  );
}

export function RankLadderSkeleton() {
  return <Skeleton tone="dark" className="min-h-[11rem] rounded-2xl" />;
}

export function CommandCenterSkeleton({ className }: { className?: string }) {
  return <Skeleton tone="dark" className={cn("min-h-[18rem] rounded-2xl", className)} />;
}

export function SessionsListSkeleton() {
  return <Skeleton tone="dark" className="min-h-[12rem] rounded-2xl" />;
}

export function ProgressSnapshotSkeleton() {
  return <Skeleton tone="dark" className="min-h-[8rem] rounded-2xl" />;
}

export function BriefCardSkeleton() {
  return <Skeleton tone="dark" className="min-h-[5rem] rounded-2xl" />;
}

export function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-[220px] w-full min-w-0 rounded", className)} />;
}

export function MasteryGridSkeleton({
  className,
  squareCount = 36,
  showLegend = true,
}: {
  className?: string;
  squareCount?: number;
  showLegend?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F172A]/60 p-5 sm:p-6",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center gap-2">
        <MentrixaBrandMark kind="mentrixer" size="xs" className="text-violet-400" />
        <Skeleton tone="dark" className="h-3 w-28 rounded" />
      </div>
      <Skeleton tone="dark" className="mt-2 h-4 w-44 rounded" />
      {showLegend ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} tone="dark" className="h-6 w-24 rounded-full" />
          ))}
        </div>
      ) : null}
      <div className="skeleton--shimmer relative mt-5 grid grid-cols-8 gap-1.5 sm:grid-cols-10 md:grid-cols-12">
        {Array.from({ length: squareCount }).map((_, index) => (
          <Skeleton
            key={index}
            tone="dark"
            animationType="none"
            className="aspect-square rounded-sm"
          />
        ))}
      </div>
      <Skeleton tone="dark" className="mt-5 h-4 w-full max-w-lg rounded" />
    </section>
  );
}

export function RankCardSkeleton() {
  return (
    <SkeletonFrame
      tone="dark"
      className={cn(mentrixStudent.pageBgArena, "min-h-screen")}
      aria-label="Loading rank passport"
    >
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:pb-24 lg:pt-12">
        <Skeleton tone="dark" className="mb-8 h-12 rounded-2xl" />

        <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <MentrixaBrandMark kind="mentrixer" size="md" className="opacity-80" />
              <Skeleton tone="dark" className="absolute inset-0 rounded-2xl opacity-60" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton tone="dark" className="h-3 w-24 rounded" />
              <Skeleton tone="dark" className="h-9 w-48 max-w-full rounded-lg" />
              <Skeleton tone="dark" className="h-4 w-32 rounded" />
            </div>
          </div>
          <Skeleton tone="dark" className="h-4 w-40 rounded" />
        </header>

        <MasteryGridSkeleton className="mb-8" />

        <Skeleton tone="dark" className="mb-8 min-h-[10rem] rounded-2xl" />

        <div className="space-y-3">
          <Skeleton tone="dark" className="h-14 rounded-2xl" />
          <Skeleton tone="dark" className="h-14 rounded-2xl" />
        </div>

        <Skeleton tone="dark" className="mt-8 h-16 rounded-2xl" />
      </div>
    </SkeletonFrame>
  );
}

export function StudentProfileSkeleton() {
  return (
    <SkeletonFrame
      className="min-h-screen bg-slate-50 pb-24 text-indigo-950"
      aria-label="Loading profile"
    >
      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <Skeleton className="mb-12 h-10 w-44 rounded-2xl" />

        <div className="rounded-[3rem] border border-indigo-100 bg-white p-8 sm:p-10">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
            <div className="relative mx-auto flex h-40 w-40 shrink-0 items-center justify-center rounded-[2.5rem] border border-indigo-100 bg-indigo-50/50 sm:mx-0 sm:h-48 sm:w-48">
              <MentrixaBrandMark kind="mentrixer" size="md" className="opacity-70" />
              <Skeleton className="absolute inset-0 rounded-[2.5rem] opacity-50" />
            </div>
            <div className="min-w-0 flex-1 space-y-5">
              <Skeleton className="h-9 w-56 max-w-full rounded-lg" />
              <Skeleton className="h-4 w-full max-w-md rounded" />
              <Skeleton className="h-1.5 w-full rounded-full" />
              <div className="grid gap-3 sm:grid-cols-3">
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>

        <Skeleton className="mt-8 min-h-[22rem] rounded-[2.5rem]" />
        <Skeleton className="mt-8 min-h-[14rem] rounded-[2.5rem]" />
      </main>
    </SkeletonFrame>
  );
}

export function SubscribeCheckoutSkeleton() {
  return (
    <main className={mentrixStudent.main}>
      <section className={`${mentrixStudent.card} relative mx-auto max-w-xl overflow-hidden p-6 sm:p-8`}>
        <MentrixaSkeletonWatermark kind="mentrixa" className="opacity-80" />
        <div className="relative flex items-center gap-2">
          <MentrixaBrandMark kind="mentrixa" size="sm" />
          <Skeleton className="h-3 w-40 rounded" />
        </div>
        <Skeleton className="mt-2 h-8 w-44 rounded-lg" />
        <SkeletonTextLines lines={2} className="mt-3" />
        <Skeleton className="mt-6 h-10 w-full rounded-xl" />
        <Skeleton className="mt-4 h-9 w-36 rounded-lg" />
        <div className="mt-5 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full rounded" />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Skeleton className="h-10 w-44 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </section>
    </main>
  );
}

"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { Skeleton, type SkeletonTone } from "@/shared/ui/skeleton";
import { MentrixaSkeletonWatermark } from "@/shared/ui/mentrixa-ui-brand";
import { UiSkeletonShimmer, UiSkeletonShimmerGrid } from "@/components/ui";
import { BklitShimmer, BklitShimmerGrid } from "@/shared/ui/bklit-shimmer";

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
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <BklitShimmer
          key={index}
          className="h-[5.5rem] rounded-2xl"
          aria-label={index === 0 ? "Loading metrics" : undefined}
        />
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
      <BklitShimmer className="h-48 w-full rounded-2xl" aria-label="Loading verdict" />
      <BklitShimmer className="h-56 w-full rounded-2xl" aria-label="Loading mastery grid" />
      <div className="space-y-6">
        <BklitShimmer className="h-32 w-full rounded-2xl" aria-label="Loading progress" />
        <BklitShimmer className="h-40 w-full rounded-2xl" aria-label="Loading rank ladder" />
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
      <BklitShimmer className="h-10 w-full max-w-[12rem] rounded-lg" aria-label="Loading quest header" />
      <BklitShimmer className="h-36 rounded-2xl" aria-label="Loading question" />
      <BklitShimmerGrid count={4} className="grid gap-3 sm:grid-cols-2" itemClassName="h-24 rounded-xl" />
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
      <BklitShimmer className="h-24 w-full rounded-2xl" aria-label="Loading duel header" />
      <BklitShimmerGrid count={6} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" itemClassName="h-40 rounded-3xl" />
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
      <BklitShimmer className="h-40 w-full rounded-2xl" aria-label="Loading guide hero" />
      <UiSkeletonShimmerGrid count={5} className="grid grid-cols-2 gap-3 sm:grid-cols-5" itemClassName="h-[5.5rem] rounded-2xl" />
      <div className="grid gap-8 lg:grid-cols-12">
        <BklitShimmer className="min-h-[26rem] rounded-xl lg:col-span-8" aria-label="Loading schedule" />
        <aside className="space-y-6 lg:col-span-4">
          <BklitShimmer className="min-h-[11rem] rounded-xl" aria-label="Loading impact" />
          <BklitShimmer className="min-h-[18rem] rounded-xl" aria-label="Loading sessions" />
          <BklitShimmer className="min-h-[12rem] rounded-xl" aria-label="Loading payouts" />
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
      <BklitShimmer className="mx-auto min-h-[70vh] max-w-6xl rounded-3xl" aria-label="Loading hero" />
      <BklitShimmer className="mx-auto min-h-[55vh] max-w-6xl rounded-3xl" aria-label="Loading section" />
      <BklitShimmer className="mx-auto min-h-[45vh] max-w-6xl rounded-3xl" aria-label="Loading section" />
    </SkeletonFrame>
  );
}

export function RankLadderSkeleton() {
  return <BklitShimmer className="min-h-[11rem] rounded-2xl" aria-label="Loading rank ladder" />;
}

export function CommandCenterSkeleton({ className }: { className?: string }) {
  return <BklitShimmer className={cn("min-h-[18rem] rounded-2xl", className)} aria-label="Loading command center" />;
}

export function SessionsListSkeleton() {
  return <BklitShimmer className="min-h-[12rem] rounded-2xl" aria-label="Loading sessions" />;
}

export function ProgressSnapshotSkeleton() {
  return <BklitShimmer className="min-h-[8rem] rounded-2xl" aria-label="Loading progress" />;
}

export function BriefCardSkeleton() {
  return <BklitShimmer className="min-h-[5rem] rounded-2xl" aria-label="Loading brief" />;
}

export function ChartSkeleton({ className }: { className?: string }) {
  return <BklitShimmer className={cn("h-[220px] w-full min-w-0 rounded", className)} aria-label="Loading chart" />;
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
        "relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--mx-navy-2)]/60 p-5 sm:p-6",
        className,
      )}
      aria-label="Loading mastery grid"
      aria-busy="true"
    >
      <BklitShimmer className="h-3 w-28 rounded" aria-label="Loading grid title" />
      <BklitShimmer className="mt-2 h-4 w-44 rounded" />
      {showLegend ? (
        <BklitShimmerGrid
          count={4}
          className="mt-4 flex flex-wrap gap-3"
          itemClassName="h-6 w-24 rounded-full"
        />
      ) : null}
      <BklitShimmerGrid
        count={squareCount}
        className="mt-5 grid grid-cols-8 gap-1.5 sm:grid-cols-10 md:grid-cols-12"
        itemClassName="aspect-square w-full rounded-sm"
      />
      <BklitShimmer className="mt-5 h-4 w-full max-w-lg rounded" />
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
        <BklitShimmer className="mb-8 h-12 rounded-2xl" aria-label="Loading navigation" />
        <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-5">
            <BklitShimmer className="h-20 w-20 shrink-0 rounded-2xl sm:h-20 sm:w-20" aria-label="Loading avatar" />
            <div className="min-w-0 flex-1 space-y-2">
              <BklitShimmer className="h-3 w-24 rounded" />
              <BklitShimmer className="h-9 w-48 max-w-full rounded-lg" />
              <BklitShimmer className="h-4 w-32 rounded" />
            </div>
          </div>
          <BklitShimmer className="h-4 w-40 rounded" />
        </header>
        <MasteryGridSkeleton className="mb-8" />
        <BklitShimmer className="mb-8 min-h-[10rem] rounded-2xl" aria-label="Loading verdict" />
        <div className="space-y-3">
          <BklitShimmer className="h-14 rounded-2xl" />
          <BklitShimmer className="h-14 rounded-2xl" />
        </div>
        <BklitShimmer className="mt-8 h-16 rounded-2xl" aria-label="Loading footer" />
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
        <BklitShimmer className="mb-12 h-10 w-44 rounded-2xl" aria-label="Loading back link" />
        <div className="rounded-[3rem] border border-indigo-100 bg-white p-8 sm:p-10">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
            <BklitShimmer className="mx-auto h-40 w-40 shrink-0 rounded-[2.5rem] sm:mx-0 sm:h-48 sm:w-48" aria-label="Loading avatar" />
            <div className="min-w-0 flex-1 space-y-5">
              <BklitShimmer className="h-9 w-56 max-w-full rounded-lg" />
              <BklitShimmer className="h-4 w-full max-w-md rounded" />
              <BklitShimmer className="h-1.5 w-full rounded-full" />
              <BklitShimmerGrid count={3} className="grid gap-3 sm:grid-cols-3" itemClassName="h-16 rounded-2xl" />
            </div>
          </div>
        </div>
        <BklitShimmer className="mt-8 min-h-[22rem] rounded-[2.5rem]" aria-label="Loading activity" />
        <BklitShimmer className="mt-8 min-h-[14rem] rounded-[2.5rem]" aria-label="Loading sessions" />
      </main>
    </SkeletonFrame>
  );
}

export function SubscribeCheckoutSkeleton() {
  return (
    <main className={mentrixStudent.main}>
      <section className={`${mentrixStudent.card} relative mx-auto max-w-xl overflow-hidden p-6 sm:p-8`}>
        <MentrixaSkeletonWatermark kind="mentrixa" className="opacity-80" />
        <BklitShimmer className="h-3 w-40 rounded" aria-label="Loading checkout" />
        <BklitShimmer className="mt-2 h-8 w-44 rounded-lg" />
        <BklitShimmer className="mt-3 h-4 w-full rounded" />
        <BklitShimmer className="mt-1 h-4 w-5/6 rounded" />
        <BklitShimmer className="mt-6 h-10 w-full rounded-xl" />
        <BklitShimmer className="mt-4 h-9 w-36 rounded-lg" />
        <div className="mt-5 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <BklitShimmer key={index} className="h-4 w-full rounded" />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <BklitShimmer className="h-10 w-44 rounded-lg" />
          <BklitShimmer className="h-10 w-32 rounded-lg" />
        </div>
      </section>
    </main>
  );
}

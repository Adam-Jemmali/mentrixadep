"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { AccountRankLadder } from "@/components/student/account-rank-ladder";
import type { StudentStatStripMotion } from "./student-stat-strip-motion";
import type { StudentCommandCenterClient } from "./student-command-center-client";
import type { TopRivalCard } from "@/components/top-rival-card";
import type { PreSessionBriefCard } from "@/components/pre-session-brief-card";
import type { StudentStudyPackageNotifier } from "./student-study-package-notifier";

const rankLadderFallback = (
  <div
    className="min-h-[11rem] rounded-2xl border border-violet-200 bg-white/90"
    aria-hidden
  />
);

const statStripFallback = (
  <div
    className="grid min-h-[5.5rem] grid-cols-2 gap-3 sm:grid-cols-4"
    aria-hidden
  >
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-violet-200 bg-white/90" />
    ))}
  </div>
);

export const DeferredAccountRankLadder = dynamic(
  () =>
    import("@/components/student/account-rank-ladder").then((m) => ({
      default: m.AccountRankLadder,
    })),
  { loading: () => rankLadderFallback },
) as typeof AccountRankLadder;

export const DeferredStudentStatStripMotion = dynamic(
  () =>
    import("./student-stat-strip-motion").then((m) => ({
      default: m.StudentStatStripMotion,
    })),
  { loading: () => statStripFallback },
) as typeof StudentStatStripMotion;

export const DeferredHeroMentrixerBounce = dynamic(
  () =>
    import("@/components/student/hero-mentrixer-bounce").then((m) => ({
      default: m.HeroMentrixerBounce,
    })),
  { loading: () => null, ssr: false },
);

export const DeferredStudentCommandCenterClient = dynamic(
  () =>
    import("./student-command-center-client").then((m) => ({
      default: m.StudentCommandCenterClient,
    })),
  {
    loading: () => (
      <div className="min-h-[18rem] rounded-2xl border border-violet-200 bg-white/90" aria-hidden />
    ),
  },
) as typeof StudentCommandCenterClient;

export const DeferredTopRivalCard = dynamic(
  () =>
    import("@/components/top-rival-card").then((m) => ({
      default: m.TopRivalCard,
    })),
  { loading: () => null },
) as typeof TopRivalCard;

export const DeferredPreSessionBriefCard = dynamic(
  () =>
    import("@/components/pre-session-brief-card").then((m) => ({
      default: m.PreSessionBriefCard,
    })),
  { loading: () => <div className="min-h-[5rem] rounded-2xl border border-violet-200 bg-white/90" aria-hidden /> },
) as typeof PreSessionBriefCard;

export const DeferredStudentStudyPackageNotifier = dynamic(
  () =>
    import("./student-study-package-notifier").then((m) => ({
      default: m.StudentStudyPackageNotifier,
    })),
  { loading: () => null, ssr: false },
) as typeof StudentStudyPackageNotifier;

const DeferredSessionsListInner = dynamic(
  () => import("./sessions-list").then((m) => ({ default: m.SessionsList })),
  {
    loading: () => (
      <div className="min-h-[12rem] rounded-2xl border border-violet-200 bg-white" aria-hidden />
    ),
  },
);

export function DeferredSessionsList(
  props: ComponentProps<typeof import("./sessions-list").SessionsList>,
) {
  return <DeferredSessionsListInner {...props} />;
}

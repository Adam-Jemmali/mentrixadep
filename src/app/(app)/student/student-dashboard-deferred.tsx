"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { AccountRankLadder } from "@/features/student-profile/ui/account-rank-ladder";
import type { StudentStatStripMotion } from "./student-stat-strip-motion";
import type { StudentCommandCenterClient } from "./student-command-center-client";
import type { TopRivalCard } from "@/features/divisions/top-rival-card";
import type { PreSessionBriefCard } from "@/features/pre-session-brief/brief-card";
import type { StudentStudyPackageNotifier } from "./student-study-package-notifier";
import {
  BriefCardSkeleton,
  CommandCenterSkeleton,
  ProgressSnapshotSkeleton,
  RankLadderSkeleton,
  SessionsListSkeleton,
  SkeletonStatGrid,
} from "@/shared/ui/skeleton-patterns";

export const DeferredAccountRankLadder = dynamic(
  () =>
    import("@/features/student-profile/ui/account-rank-ladder").then((m) => ({
      default: m.AccountRankLadder,
    })),
  { loading: () => <RankLadderSkeleton /> },
) as typeof AccountRankLadder;

export const DeferredStudentStatStripMotion = dynamic(
  () =>
    import("./student-stat-strip-motion").then((m) => ({
      default: m.StudentStatStripMotion,
    })),
  { loading: () => <SkeletonStatGrid /> },
) as typeof StudentStatStripMotion;

export const DeferredHeroMentrixerBounce = dynamic(
  () =>
    import("@/features/student-profile/ui/hero-mentrixer-bounce").then((m) => ({
      default: m.HeroMentrixerBounce,
    })),
  { loading: () => null, ssr: false },
);

export const DeferredStudentCommandCenterClient = dynamic(
  () =>
    import("./student-command-center-client").then((m) => ({
      default: m.StudentCommandCenterClient,
    })),
  { loading: () => <CommandCenterSkeleton /> },
) as typeof StudentCommandCenterClient;

export const DeferredTopRivalCard = dynamic(
  () =>
    import("@/features/divisions/top-rival-card").then((m) => ({
      default: m.TopRivalCard,
    })),
  { loading: () => null },
) as typeof TopRivalCard;

export const DeferredPreSessionBriefCard = dynamic(
  () =>
    import("@/features/pre-session-brief/brief-card").then((m) => ({
      default: m.PreSessionBriefCard,
    })),
  { loading: () => <BriefCardSkeleton /> },
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
  { loading: () => <SessionsListSkeleton /> },
);

export function DeferredSessionsList(
  props: ComponentProps<typeof import("./sessions-list").SessionsList>,
) {
  return <DeferredSessionsListInner {...props} />;
}

export const DeferredProgressSnapshotCard = dynamic(
  () =>
    import("@/features/progress-snapshot/ui/progress-snapshot-card").then((m) => ({
      default: m.ProgressSnapshotCard,
    })),
  {
    loading: () => <ProgressSnapshotSkeleton />,
  },
);

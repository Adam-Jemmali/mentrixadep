"use client";

import type { TutorCommandCenterPayload } from "@/features/tutor/command-center";
import { GUIDE_HOME } from "@/features/tutor/guide-home-copy-pure";
import { StatCard } from "@/components/ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  CANONICAL_BOOKING_ICON,
  CANONICAL_IMPACT_SCORE_ICON,
  CANONICAL_SESSION_ICON,
} from "@/shared/icons/vocab-canonical";

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function GuideMetricsStatRow({ data }: { data: TutorCommandCenterPayload }) {
  const { metrics } = data;
  const pending = metrics.pendingRequestCount;

  const cards = [
    {
      eyebrow: GUIDE_HOME.metrics.monthEarnings,
      value: formatUsd(metrics.earningsThisMonthCents),
      caption: metrics.stripePayoutCaption,
      icon: <MentrixaVocabIcon name={CANONICAL_BOOKING_ICON} size={16} surface="light" title="Earnings" />,
      trend: "up" as const,
      trendLabel: "Month to date",
      alert: false,
    },
    {
      eyebrow: GUIDE_HOME.metrics.sessionsWeek,
      value: String(metrics.sessionsThisWeek),
      icon: <MentrixaVocabIcon name={CANONICAL_SESSION_ICON} size={16} surface="light" title="Sessions" />,
      trend: metrics.sessionsThisWeek > 0 ? ("up" as const) : ("flat" as const),
      trendLabel: metrics.sessionsThisWeek > 0 ? "Active week" : "No sessions yet",
      alert: false,
    },
    {
      eyebrow: GUIDE_HOME.metrics.avgRating,
      value: metrics.avgRating != null ? metrics.avgRating.toFixed(1) : "—",
      icon: <MentrixaVocabIcon name={CANONICAL_IMPACT_SCORE_ICON} size={16} surface="light" title="Rating" />,
      trend:
        metrics.avgRating != null && metrics.avgRating >= 4.5
          ? ("up" as const)
          : metrics.avgRating != null
            ? ("flat" as const)
            : undefined,
      trendLabel: metrics.avgRating != null ? "Verified reviews" : undefined,
      alert: false,
    },
    {
      eyebrow: GUIDE_HOME.metrics.responseRate,
      value: metrics.responseRatePercent != null ? `${metrics.responseRatePercent.toFixed(1)}%` : "—",
      icon: <MentrixaVocabIcon name="brief" size={16} surface="light" title="Response" />,
      trend:
        metrics.responseRatePercent != null && metrics.responseRatePercent >= 90
          ? ("up" as const)
          : metrics.responseRatePercent != null
            ? ("flat" as const)
            : undefined,
      alert: false,
    },
    {
      eyebrow: GUIDE_HOME.metrics.requests,
      value: String(pending),
      icon: <MentrixaVocabIcon name={CANONICAL_BOOKING_ICON} size={16} surface="light" title="Requests" />,
      trend: pending > 0 ? ("up" as const) : ("flat" as const),
      trendLabel: pending > 0 ? "Needs reply" : "Inbox clear",
      alert: pending > 0,
    },
  ];

  return (
    <section
      className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5"
      aria-label="Guide home metrics"
    >
      {cards.map((card) => (
        <StatCard key={card.eyebrow} {...card} />
      ))}
    </section>
  );
}

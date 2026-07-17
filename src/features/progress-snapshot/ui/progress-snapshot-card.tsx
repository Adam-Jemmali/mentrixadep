"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { RankBadge } from "@/features/xp/components/rank-badge";
import { normalizeRankTitle } from "@/features/xp/rank-icons";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { ProgressSnapshotRow } from "@/features/progress-snapshot/types";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import { VerdictPanel } from "@/features/guidance/verdict-panel";
import {
  formatStudentBreakthroughPrice,
  getStudentSessionCheckoutCents,
} from "@/features/booking/booking-pricing";
import { formatUsdFromCents } from "@/features/duels/duel-reward";

function dismissKey(snapshotId: string) {
  return `mentrixa:progress-snapshot:dismissed:${snapshotId}`;
}

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "0";
}

export function ProgressSnapshotCard({
  snapshot,
  weeklyVerdict = null,
  momentumSubscriber = false,
}: {
  snapshot: ProgressSnapshotRow;
  weeklyVerdict?: Verdict | null;
  momentumSubscriber?: boolean;
}) {
  const [visible, setVisible] = useState(true);
  const data = snapshot.snapshot_data;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(dismissKey(snapshot.id)) === "1") {
      setVisible(false);
    }
  }, [snapshot.id]);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(dismissKey(snapshot.id), "1");
    }
    setVisible(false);
  }, [snapshot.id]);

  const onCtaClick = useCallback(() => {
    void fetch("/api/progress-snapshot/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ snapshotId: snapshot.id }),
      keepalive: true,
    }).catch(() => {});
  }, [snapshot.id]);

  if (!visible) return null;

  const rankDirection = data.rankChange.direction;
  const divDelta = data.divisionRank.delta;

  const sessionPriceLabel = formatUsdFromCents(
    getStudentSessionCheckoutCents({ momentumSubscriber }),
  );

  return (
    <div className={`${mentrixStudent.card} relative overflow-hidden p-5 sm:p-6`}>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
        aria-label="Dismiss weekly snapshot"
      >
        ×
      </button>
      <p className={mentrixStudent.sectionEyebrowOnLight}>Your week in {data.subject}</p>

      {weeklyVerdict ? (
        <div className="mt-4">
          <VerdictPanel verdict={weeklyVerdict} tone="light" showNextAction={false} />
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex items-center gap-3">
          <RankBadge rank={data.rankChange.previous} size="md" />
          <span className="text-lg text-zinc-400" aria-hidden>
            →
          </span>
          <RankBadge rank={data.rankChange.current} size="md" animate={rankDirection === "up"} />
        </div>
        <div className="min-w-0 space-y-1 text-sm text-zinc-700">
          <p>
            Rank:{" "}
            <strong>{normalizeRankTitle(data.rankChange.previous.title)}</strong>
            {" → "}
            <strong>{normalizeRankTitle(data.rankChange.current.title)}</strong>
            {rankDirection === "up" ? " ↑" : rankDirection === "down" ? " ↓" : ""}
          </p>
          <p>
            Quest accuracy: <strong>{data.accuracyThisWeek}%</strong> ({signed(data.accuracyDelta)}% vs last week)
          </p>
          <p>
            Duels: <strong>{data.duelsWon}</strong> won, <strong>{data.duelsLost}</strong> lost
          </p>
          <p>
            Division rank: <strong>#{data.divisionRank.current}</strong>
            {divDelta !== 0
              ? ` (${divDelta > 0 ? "up" : "down"} from #${data.divisionRank.previous})`
              : ""}
          </p>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Weak spot: {data.weakestConcept.label}</p>
        <p className="mt-1 text-amber-900/90">
          {data.weakestConcept.accuracyPercent}% accuracy — one Guide session on this is the fastest path to{" "}
          {normalizeRankTitle(data.predictedNextRank.title)}
          {data.predictedNextRank.daysAtCurrentPace != null
            ? ` (about ${data.predictedNextRank.daysAtCurrentPace} days at your current pace)`
            : ""}
          .
        </p>
        {data.recommendedGuide.impactScore > 0 ? (
          <p className="mt-2 text-sm font-medium text-emerald-900">
            {data.recommendedGuide.displayName} has a {Math.round(data.recommendedGuide.impactScore)} Impact Score
            in {data.recommendedGuide.impactSubject}.
          </p>
        ) : null}
      </div>
      <Button asChild className="mt-4 w-full sm:w-auto">
        <Link href={weeklyVerdict?.nextAction.href ?? data.bookingCtaUrl} onClick={onCtaClick}>
          {weeklyVerdict?.nextAction.label ??
            `Book ${data.recommendedGuide.displayName} — ${sessionPriceLabel}${
              momentumSubscriber ? " (member rate)" : ` (pay as you go is ${formatStudentBreakthroughPrice()})`
            }`}
        </Link>
      </Button>
    </div>
  );
}


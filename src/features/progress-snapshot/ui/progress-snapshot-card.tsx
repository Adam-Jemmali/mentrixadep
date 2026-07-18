"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { RankBadge } from "@/features/xp/components/rank-badge";
import { normalizeRankTitle } from "@/features/xp/rank-icons";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { ProgressSnapshotRow } from "@/features/progress-snapshot/types";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import {
  formatStudentBreakthroughPrice,
  getStudentSessionCheckoutCents,
} from "@/features/booking/booking-pricing";
import { formatUsdFromCents } from "@/features/duels/duel-reward";
import { HubVocabIcon } from "@/features/student-profile/ui/hub-vocab-icon";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

function dismissKey(snapshotId: string) {
  return `mentrixa:progress-snapshot:dismissed:${snapshotId}`;
}

function accuracyDeltaLabel(n: number): string {
  if (n > 0) return `up ${n}% vs last week`;
  if (n < 0) return `down ${Math.abs(n)}% vs last week`;
  return "flat vs last week";
}

function StatRow({
  icon,
  label,
  children,
  tone,
}: {
  icon: VocabIconName;
  label: string;
  children: ReactNode;
  tone?: "violet" | "amber";
}) {
  const labelClass =
    tone === "amber"
      ? "inline-flex rounded-md bg-amber-300 px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-950"
      : "text-[11px] font-semibold uppercase tracking-wide text-zinc-500";
  return (
    <div className="flex items-start gap-3">
      <HubVocabIcon name={icon} title={label} tone={tone} size={28} />
      <div className="min-w-0 pt-0.5">
        <p className={labelClass}>{label}</p>
        <div className="mt-0.5 text-sm font-medium text-zinc-800">{children}</div>
      </div>
    </div>
  );
}

export function ProgressSnapshotCard({
  snapshot,
  weeklyVerdict = null,
  momentumSubscriber = false,
  liveWeakest = null,
}: {
  snapshot: ProgressSnapshotRow;
  weeklyVerdict?: Verdict | null;
  momentumSubscriber?: boolean;
  liveWeakest?: { label: string; accuracyPercent: number } | null;
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
  const prevRank = normalizeRankTitle(data.rankChange.previous.title);
  const curRank = normalizeRankTitle(data.rankChange.current.title);
  const nextRank = normalizeRankTitle(data.predictedNextRank.title);
  const paceDays = data.predictedNextRank.daysAtCurrentPace;

  const weakLabel = liveWeakest?.label ?? data.weakestConcept.label;
  const weakAccuracy = liveWeakest?.accuracyPercent ?? data.weakestConcept.accuracyPercent;

  const sessionPriceLabel = formatUsdFromCents(
    getStudentSessionCheckoutCents({ momentumSubscriber }),
  );

  const ctaLabel =
    weeklyVerdict?.nextAction.label ??
    `Book ${data.recommendedGuide.displayName} · ${sessionPriceLabel}${
      momentumSubscriber ? " member" : ` · pay as you go ${formatStudentBreakthroughPrice()}`
    }`;

  const divisionLine =
    divDelta > 0
      ? `#${data.divisionRank.current} · up from #${data.divisionRank.previous}`
      : divDelta < 0
        ? `#${data.divisionRank.current} · down from #${data.divisionRank.previous}`
        : `#${data.divisionRank.current}`;

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

      <div className="flex items-center gap-2">
        <HubVocabIcon name="day" title="Your week" size={28} />
        <p className={mentrixStudent.sectionEyebrowOnLight}>Your week in {data.subject}</p>
      </div>

      {weeklyVerdict ? (
        <div className="mt-4 space-y-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
          <StatRow icon="rank-proof" label="This week">
            {weeklyVerdict.changed}
          </StatRow>
          <StatRow icon="focus-ring" label="Weakest" tone="amber">
            {liveWeakest
              ? `Weakest: ${weakLabel} at ${weakAccuracy}%.`
              : weeklyVerdict.reason || `Weakest: ${weakLabel} at ${weakAccuracy}%.`}
          </StatRow>
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <RankBadge rank={data.rankChange.previous} size="md" />
        <MentrixaVocabIcon name="verified" size={20} surface="light" title="to" />
        <RankBadge rank={data.rankChange.current} size="md" animate={rankDirection === "up"} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <StatRow icon="passport" label="Rank">
          {prevRank} <span className="text-zinc-400">→</span> {curRank}
          {rankDirection === "up" ? " ↑" : rankDirection === "down" ? " ↓" : ""}
        </StatRow>
        <StatRow icon="quest" label="Quest accuracy">
          {data.accuracyThisWeek}% · {accuracyDeltaLabel(data.accuracyDelta)}
        </StatRow>
        <StatRow icon="duels" label="Duels">
          {data.duelsWon} won · {data.duelsLost} lost
        </StatRow>
        <StatRow icon="league" label="Division rank">
          {divisionLine}
        </StatRow>
      </div>

      <div className="mt-5 rounded-xl border border-amber-300 bg-amber-100/80 px-4 py-3">
        <div className="flex items-start gap-3">
          <HubVocabIcon name="focus-ring" title="Weakest" tone="amber" size={28} />
          <div className="min-w-0 text-sm text-amber-950">
            <p className="inline-flex items-center rounded-md bg-amber-300 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-950">
              Weakest
            </p>
            <p className="mt-1.5 font-semibold">{weakLabel}</p>
            <p className="mt-1 text-amber-900/90">
              {weakAccuracy}% accuracy. Guide session → {nextRank}
              {paceDays != null ? `. ~${paceDays} days at current pace` : ""}.
            </p>
            {data.recommendedGuide.impactScore > 0 ? (
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-emerald-900">
                <MentrixaVocabIcon name="impact-score" size={20} surface="light" title="Impact" />
                {data.recommendedGuide.displayName} · {Math.round(data.recommendedGuide.impactScore)}{" "}
                Impact on {data.recommendedGuide.impactSubject}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <Button asChild className="mt-4 w-full sm:w-auto">
        <Link href={weeklyVerdict?.nextAction.href ?? data.bookingCtaUrl} onClick={onCtaClick}>
          {ctaLabel}
        </Link>
      </Button>
    </div>
  );
}

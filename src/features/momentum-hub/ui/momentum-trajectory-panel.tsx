"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import type { TrajectoryPanelView } from "@/features/momentum-hub/momentum-trajectory-enrichment-pure";
import { MOMENTUM_MEMBERSHIP_FEATURE_EYEBROW } from "@/features/payments/momentum-membership-pure";

function TrajectorySparkline({ points }: { points: { date: string; score: number }[] }) {
  if (points.length < 2) {
    return (
      <p className="text-xs text-zinc-500">Trend builds after a few days of Momentum activity.</p>
    );
  }

  const width = 240;
  const height = 48;
  const min = Math.min(...points.map((p) => p.score), 0);
  const max = Math.max(...points.map((p) => p.score), 100);
  const range = Math.max(max - min, 1);

  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((point.score - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-12 w-full max-w-xs text-violet-600"
      aria-label="30-day trajectory trend"
      role="img"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords.join(" ")}
      />
    </svg>
  );
}

function ComponentBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
        <span>{label}</span>
        <span className="tabular-nums text-zinc-900">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-violet-600 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

type MomentumTrajectoryPanelProps = {
  data: TrajectoryPanelView;
};

export function MomentumTrajectoryPanel({ data }: MomentumTrajectoryPanelProps) {
  if (data.mode === "teaser") {
    return (
      <section className={`${mentrixStudent.card} p-5 sm:p-6`} aria-label="Trajectory index teaser">
        <VocabSectionHeading name="trajectory-certificate" label="Trajectory index" surface="light" gold />
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
          {MOMENTUM_MEMBERSHIP_FEATURE_EYEBROW}
        </p>
        <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-400">{data.scoreBand}</p>
        <p className="mt-3 text-sm text-zinc-600">{data.upsellLine}</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/student/subscribe">Unlock Trajectory Index</Link>
        </Button>
      </section>
    );
  }

  const { trajectory, bottleneck, weekOverWeek, peerLine, history, goalRunway, guidedAction } = data;

  return (
    <section className={`${mentrixStudent.card} p-5 sm:p-6`} aria-label="Trajectory index">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <VocabSectionHeading name="trajectory-certificate" label="Trajectory index" surface="light" gold />
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
          {MOMENTUM_MEMBERSHIP_FEATURE_EYEBROW}
        </p>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums text-[#D4A017]">{trajectory.score}</p>
          {weekOverWeek ? (
            <p className="text-xs font-semibold text-zinc-600">{weekOverWeek}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <TrajectorySparkline points={history} />
      </div>

      <p className="mt-3 text-sm font-semibold text-zinc-900">{trajectory.verdict}</p>

      <div className="mt-4 space-y-3">
        <ComponentBar label="Verified nodes" value={trajectory.verifiedComponent} />
        <ComponentBar label="Retest closure" value={trajectory.retestComponent} />
        <ComponentBar label="Loop delta" value={trajectory.loopComponent} />
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-950">
          {bottleneck.label} at {bottleneck.current} — {bottleneck.fixAction}
        </p>
      </div>

      {peerLine ? (
        <p className="mt-3 text-sm font-medium text-indigo-800">{peerLine}</p>
      ) : null}

      {goalRunway ? (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Exam runway</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-indigo-600"
              style={{ width: `${goalRunway.progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-zinc-900">{goalRunway.verdict}</p>
          <p className="mt-1 text-sm text-zinc-600">{goalRunway.nextAction}</p>
        </div>
      ) : null}

      {guidedAction ? (
        <div className="mt-4">
          <Button asChild size="lg" className={mentrixStudent.hubBtnSolid}>
            <Link href={guidedAction.href}>{guidedAction.label}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-zinc-600">{trajectory.nextAction}</p>
          <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/student/loop">Full loop history</Link>
          </Button>
          </div>
        </div>
      )}
    </section>
  );
}

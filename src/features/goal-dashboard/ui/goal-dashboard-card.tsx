"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { GoalDashboardData } from "@/features/goal-dashboard/load-goal-dashboard";
import { MOMENTUM_MEMBERSHIP_FEATURE_EYEBROW } from "@/features/payments/momentum-membership-pure";
import { peerTopPercent } from "@/features/xp/rank-statistics-pure";

export function GoalDashboardCard({ data }: { data: GoalDashboardData }) {
  return (
    <section className={`${mentrixStudent.card} p-5 sm:p-6`} aria-label="Goal dashboard">
      <p className={mentrixStudent.sectionEyebrowOnLight}>Goal dashboard</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
        {MOMENTUM_MEMBERSHIP_FEATURE_EYEBROW}
      </p>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{data.verdict}</p>
      {data.peerTrendLine ? (
        <p className="mt-1 text-sm text-indigo-800">{data.peerTrendLine}</p>
      ) : null}
      {data.packSprintLine ? (
        <p className="mt-1 text-sm font-medium text-violet-800">{data.packSprintLine}</p>
      ) : null}
      <p className="mt-1 text-sm text-zinc-600">{data.nextAction}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Verified nodes</p>
          <p className="mt-1 text-lg font-black text-zinc-900">{data.verifiedNodeCount}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Top %</p>
          <p className="mt-1 text-lg font-black text-zinc-900">
            {data.currentPercentile != null ? `${peerTopPercent(data.currentPercentile)}%` : "Calibrating"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Days left</p>
          <p className="mt-1 text-lg font-black text-zinc-900">
            {data.daysUntilExam != null ? data.daysUntilExam : "—"}
          </p>
        </div>
      </div>
      <Button asChild className="mt-4" size="sm" variant="outline">
        <Link href="/student/mastery">Open Mastery Grid</Link>
      </Button>
    </section>
  );
}

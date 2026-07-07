"use client";

import Link from "next/link";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MOMENTUM_MEMBERSHIP_INCLUDED_COPY, MOMENTUM_MEMBERSHIP_UNLOCK_COPY } from "@/features/payments/momentum-membership-pure";
import { MomentumMembershipMemberChip } from "@/features/student-profile/ui/momentum-membership-member-chip";
import type { LoopReportRow } from "@/features/intervention-retests/retest-reads";
import {
  buildLoopReportNextAction,
  buildLoopReportRowVerdict,
} from "@/features/loop-report/loop-report-pure";
import {
  buildLoopClosureFunnel,
  buildLoopDeltaBadge,
  formatLoopSourceLabel,
  lockedLoopPreviewCount,
} from "@/features/loop-report/loop-report-funnel-pure";
import { retestQuestHref } from "@/features/momentum-hub/momentum-value-equation-pure";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import { Lock } from "lucide-react";

function LoopDeltaBar({ row }: { row: LoopReportRow }) {
  if (row.preAccuracy == null || row.postAccuracy == null) return null;
  const pre = Math.round(row.preAccuracy * 100);
  const post = Math.round(row.postAccuracy * 100);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
        <span>Pre → post</span>
        <span className="tabular-nums text-zinc-900">{buildLoopDeltaBadge(row)}</span>
      </div>
      <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-zinc-200">
        <div className="bg-zinc-400" style={{ width: `${pre}%` }} />
        <div className="bg-violet-600" style={{ width: `${Math.max(post - pre, 0)}%` }} />
      </div>
    </div>
  );
}

export function LoopReportPageClient({
  rows,
  momentumActive,
  totalRowCount,
}: {
  rows: LoopReportRow[];
  momentumActive: boolean;
  totalRowCount?: number;
}) {
  const funnel = buildLoopClosureFunnel(rows);
  const lockedCount = momentumActive
    ? 0
    : lockedLoopPreviewCount(totalRowCount ?? rows.length, rows.length);

  return (
    <div className={mentrixStudent.pageBgHub}>
      <main className={`${mentrixStudent.main} space-y-6`}>
        <div>
          <Link href="/student" className="text-sm text-purple-600 hover:text-violet-100">
            Back to hub
          </Link>
          {momentumActive ? <MomentumMembershipMemberChip className="mt-2" /> : null}
          <VocabSectionHeading
            name="loop-report"
            label="Loop Report"
            surface="dark"
            as="h1"
            className="mt-2"
            labelClassName="text-xl font-black normal-case tracking-tight text-purple-800 sm:text-2xl"
          />
          <p className="mt-1 text-sm text-blue-600">
            Every retest scheduled from sessions, breakthroughs, and duels.
          </p>
        </div>

        <div className={`${mentrixStudent.card} grid gap-3 p-5 sm:grid-cols-4`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Scheduled</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-zinc-900">{funnel.scheduled}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Due now</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-amber-700">{funnel.due}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Completed</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-emerald-700">{funnel.completed}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Positive delta</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-violet-700">{funnel.positiveDelta}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={`${mentrixStudent.card} p-6 text-sm text-zinc-700`}>
            No loops yet. Complete a Guide session or duel to schedule your first retest.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className={`${mentrixStudent.card} p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">
                    {formatLoopSourceLabel(row.sourceType)}
                  </p>
                  {row.completedAt ? (
                    <p className="text-xs text-zinc-500">
                      {new Date(row.completedAt).toLocaleDateString()}
                    </p>
                  ) : row.isDue ? (
                    <p className="text-xs font-semibold text-amber-700">Due now</p>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-900">{buildLoopReportRowVerdict(row)}</p>
                <LoopDeltaBar row={row} />
                <p className="mt-2 text-sm text-zinc-600">{buildLoopReportNextAction(row)}</p>
                {!row.completedAt && row.isDue ? (
                  <div className="mt-3">
                    <Link
                      href={retestQuestHref(row.nodeName, row.skillNodeId)}
                      className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                    >
                      Start retest: {row.nodeName}
                    </Link>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {lockedCount > 0 ? (
          <div className={`${mentrixStudent.card} p-5`}>
            <div className="flex items-center gap-2 text-zinc-700">
              <Lock className="h-4 w-4" aria-hidden />
              <p className="text-sm font-semibold">
                {lockedCount} more loop{lockedCount === 1 ? "" : "s"} in your history. {MOMENTUM_MEMBERSHIP_UNLOCK_COPY}
              </p>
            </div>
            <Link href="/student/subscribe" className="mt-2 inline-block text-sm font-semibold text-violet-700 underline">
              View Momentum membership plan
            </Link>
          </div>
        ) : null}

        {!momentumActive && lockedCount === 0 ? (
          <div className={`${mentrixStudent.card} p-5`}>
            <p className="text-sm text-zinc-700">
              Free accounts see the latest loop. Full Loop Report history is a Momentum membership feature.{" "}
              {MOMENTUM_MEMBERSHIP_INCLUDED_COPY}
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import {
  buildGridHistoryVerdict,
  compareGridSnapshots,
  type GridSnapshotWeek,
} from "@/features/mastery-grid/grid-history-pure";

type MasteryGridHistoryPanelProps = {
  history: GridSnapshotWeek[];
  momentumActive: boolean;
  nodeNameById: Record<string, string>;
};

export function MasteryGridHistoryPanel({
  history,
  momentumActive,
  nodeNameById,
}: MasteryGridHistoryPanelProps) {
  if (history.length === 0) {
    return (
      <section className={`${mentrixStudent.card} p-5 sm:p-6`}>
        <p className={mentrixStudent.sectionEyebrowOnLight}>Grid history</p>
        <p className="mt-2 text-sm text-zinc-700">
          Weekly snapshots start after your first verified attempts. Check back next Monday.
        </p>
      </section>
    );
  }

  if (!momentumActive) {
    const latest = history[0];
    if (!latest) return null;
    return (
      <section className={`${mentrixStudent.card} p-5 sm:p-6`}>
        <p className={mentrixStudent.sectionEyebrowOnLight}>Grid history</p>
        <p className="mt-2 text-sm font-semibold text-zinc-900">
          {latest.verifiedCount} verified nodes captured this week.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          See how your grid changed over 4, 8, and 12 weeks with Momentum. Your current grid stays free.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/student/subscribe">Unlock grid timeline</Link>
        </Button>
      </section>
    );
  }

  const newest = history[0];
  const oldestInWindow = history[Math.min(history.length - 1, 3)] ?? newest;
  const priorWindow = history[Math.min(history.length - 1, 7)] ?? oldestInWindow;
  if (!newest) return null;

  const recentFlips = compareGridSnapshots(oldestInWindow!.nodeStates, newest.nodeStates);
  const priorFlips = compareGridSnapshots(priorWindow!.nodeStates, oldestInWindow!.nodeStates);
  const { verdict, nextAction } = buildGridHistoryVerdict({
    weeksCompared: Math.min(history.length, 4),
    newlyVerifiedCount: recentFlips.newlyVerified.length,
    priorNewlyVerifiedCount: priorFlips.newlyVerified.length,
  });

  return (
    <section className={`${mentrixStudent.card} space-y-4 p-5 sm:p-6`}>
      <div>
        <p className={mentrixStudent.sectionEyebrowOnLight}>Grid timeline</p>
        <p className="mt-2 text-sm font-semibold text-zinc-900">{verdict}</p>
        <p className="mt-1 text-sm text-zinc-600">{nextAction}</p>
      </div>
      {recentFlips.newlyVerified.length > 0 ? (
        <ul className="space-y-1 text-sm text-zinc-700">
          {recentFlips.newlyVerified.slice(0, 6).map((nodeId) => (
            <li key={nodeId}>Verified: {nodeNameById[nodeId] ?? nodeId}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {history.slice(0, 4).map((week) => (
          <span
            key={week.snapshotWeek}
            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900"
          >
            {week.snapshotWeek}: {week.verifiedCount} verified
          </span>
        ))}
      </div>
    </section>
  );
}

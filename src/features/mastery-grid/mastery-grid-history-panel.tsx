"use client";

import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import {
  buildGridHistoryVerdict,
  compareGridSnapshots,
  type GridSnapshotWeek,
} from "@/features/mastery-grid/grid-history-pure";
import { MOMENTUM_MEMBERSHIP_UNLOCK_COPY } from "@/features/payments/momentum-membership-pure";
import { MomentumMembershipMemberChip } from "@/features/student-profile/ui/momentum-membership-member-chip";

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
    return null;
  }

  if (!momentumActive) {
    const latest = history[0];
    if (!latest) return null;
    return (
      <StudentStickyNote variant="pinned">
        <section>
          <p className={mentrixStudent.sectionEyebrowOnLight}>Grid history</p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            {latest.verifiedCount} verified nodes captured this week.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            See how your grid changed over 4, 8, and 12 weeks. {MOMENTUM_MEMBERSHIP_UNLOCK_COPY} Your current grid stays free.
          </p>
        </section>
      </StudentStickyNote>
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
    <StudentStickyNote variant="taped">
      <section className="space-y-4">
      <div>
        <MomentumMembershipMemberChip />
        <p className={`${mentrixStudent.sectionEyebrowOnLight} mt-2`}>Grid timeline</p>
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
    </StudentStickyNote>
  );
}

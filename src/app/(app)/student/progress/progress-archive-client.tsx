"use client";

import Link from "next/link";
import { RankBadge } from "@/features/xp/components/rank-badge";
import { normalizeRankTitle } from "@/features/xp/rank-icons";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { ProgressSnapshotRow } from "@/features/progress-snapshot/types";

export function ProgressArchiveClient({
  snapshots,
  momentumActive,
}: {
  snapshots: ProgressSnapshotRow[];
  momentumActive: boolean;
}) {
  return (
    <div className={mentrixStudent.pageBgHub}>
      <main className={`${mentrixStudent.main} space-y-6`}>
        <div>
          <Link href="/student" className="text-sm text-violet-300 hover:text-violet-100">
            Back to hub
          </Link>
          <h1 className="mt-2 text-2xl font-black text-white">Progress archive</h1>
          <p className="mt-1 text-sm text-violet-200/85">
            Weekly snapshots of rank movement, accuracy, and division standing.
          </p>
        </div>

        {!momentumActive ? (
          <div className={`${mentrixStudent.card} p-6 text-sm text-zinc-700`}>
            Your current week snapshot stays free on the hub. The full archive is included with Momentum.
          </div>
        ) : snapshots.length === 0 ? (
          <div className={`${mentrixStudent.card} p-6 text-sm text-zinc-700`}>
            Archives appear after your first weekly snapshot email.
          </div>
        ) : (
          <ul className="space-y-4">
            {snapshots.map((snapshot) => {
              const data = snapshot.snapshot_data;
              return (
                <li key={snapshot.id} className={`${mentrixStudent.card} p-5`}>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                    Week of {new Date(snapshot.generated_at).toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <RankBadge rank={data.rankChange.previous} size="sm" />
                    <span className="text-zinc-400">→</span>
                    <RankBadge rank={data.rankChange.current} size="sm" />
                  </div>
                  <p className="mt-2 text-sm text-zinc-700">
                    {normalizeRankTitle(data.rankChange.previous.title)} →{" "}
                    {normalizeRankTitle(data.rankChange.current.title)} · Quest accuracy{" "}
                    {data.accuracyThisWeek}%
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

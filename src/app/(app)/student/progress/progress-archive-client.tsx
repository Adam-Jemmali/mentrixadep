"use client";

import Link from "next/link";
import { RankBadge } from "@/features/student-profile/ui/rank-badge";
import { RANK_LADDER_CHIP_SIZE } from "@/features/xp/rank-display-tokens";
import { normalizeRankTitle } from "@/features/xp/rank-icons";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MOMENTUM_MEMBERSHIP_INCLUDED_COPY } from "@/features/payments/momentum-membership-pure";
import { MomentumMembershipMemberChip } from "@/features/student-profile/ui/momentum-membership-member-chip";
import { ProductPageHeader } from "@/features/student-profile/ui/product-page-header";
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
        <Link href="/student" className={mentrixStudent.hubGhostLink}>
          ← Back to hub
        </Link>

        <ProductPageHeader
          icon="progress-archive"
          eyebrow="Archive"
          title="Progress archive"
          subtitle="Weekly snapshots of rank movement, accuracy, and division standing."
        />

        {!momentumActive ? (
          <div className={`${mentrixStudent.card} p-6 ${mentrixStudent.pageSubtitle}`}>
            Your current week snapshot stays free on the hub. The full archive is a Momentum membership feature.{" "}
            {MOMENTUM_MEMBERSHIP_INCLUDED_COPY}
          </div>
        ) : snapshots.length === 0 ? (
          <div className={`${mentrixStudent.card} p-6 ${mentrixStudent.pageSubtitle}`}>
            <MomentumMembershipMemberChip className="mb-3" />
            Archives appear after your first weekly snapshot email.
          </div>
        ) : (
          <>
            <MomentumMembershipMemberChip />
            <ul className="space-y-4">
            {snapshots.map((snapshot) => {
              const data = snapshot.snapshot_data;
              return (
                <li key={snapshot.id} className={`${mentrixStudent.card} p-5`}>
                  <p className="mx-hub-type-ui text-[#6366F1]">
                    Week of {new Date(snapshot.generated_at).toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <RankBadge rank={data.rankChange.previous} size={RANK_LADDER_CHIP_SIZE} surface="light" active />
                    <span className="mx-hub-ink-muted">→</span>
                    <RankBadge rank={data.rankChange.current} size={RANK_LADDER_CHIP_SIZE} surface="light" active />
                  </div>
                  <p className={`mt-2 ${mentrixStudent.pageSubtitle}`}>
                    {normalizeRankTitle(data.rankChange.previous.title)} →{" "}
                    {normalizeRankTitle(data.rankChange.current.title)} · Quest accuracy{" "}
                    {data.accuracyThisWeek}%
                  </p>
                </li>
              );
            })}
          </ul>
          </>
        )}
      </main>
    </div>
  );
}

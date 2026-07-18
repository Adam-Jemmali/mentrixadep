import { getActiveProgressSnapshot } from "@/features/progress-snapshot/reads";
import { ProgressSnapshotCard } from "@/features/progress-snapshot/ui/progress-snapshot-card";

export type LiveWeakestSpot = {
  label: string;
  accuracyPercent: number;
};

/** Hub weekly snapshot. Live Weakest overrides stale snapshot when grid is present. */
export async function ProgressSnapshotHubSlot({
  momentumSubscriber = false,
  liveWeakest = null,
}: {
  momentumSubscriber?: boolean;
  liveWeakest?: LiveWeakestSpot | null;
}) {
  const active = await getActiveProgressSnapshot().catch(() => null);
  if (!active) return null;

  return (
    <ProgressSnapshotCard
      snapshot={active}
      weeklyVerdict={active.weeklyVerdict}
      momentumSubscriber={momentumSubscriber}
      liveWeakest={liveWeakest}
    />
  );
}

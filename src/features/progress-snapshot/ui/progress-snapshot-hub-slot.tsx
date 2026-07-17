import { getActiveProgressSnapshot } from "@/features/progress-snapshot/reads";
import { ProgressSnapshotCard } from "@/features/progress-snapshot/ui/progress-snapshot-card";

/** Hub weekly snapshot: Verdict Engine first, metrics as supporting detail. */
export async function ProgressSnapshotHubSlot({
  momentumSubscriber = false,
}: {
  momentumSubscriber?: boolean;
}) {
  const active = await getActiveProgressSnapshot().catch(() => null);
  if (!active) return null;

  return (
    <ProgressSnapshotCard
      snapshot={active}
      weeklyVerdict={active.weeklyVerdict}
      momentumSubscriber={momentumSubscriber}
    />
  );
}

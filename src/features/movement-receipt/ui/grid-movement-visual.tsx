"use client";

import { VocabCountMetric } from "@/shared/icons/mentrixa-vocab-icons";
import type { MovementReceiptData } from "@/features/movement-receipt/types";

export function GridMovementVisual({
  grid,
  surface = "light",
}: {
  grid: MovementReceiptData["grid"];
  surface?: "dark" | "light";
}) {
  const stalled = grid.newlyVerifiedCount === 0 && grid.flippedToWeakCount === 0;

  if (stalled) {
    return (
      <div className="flex items-end gap-3" aria-label="No new verified nodes on the grid this week">
        <VocabCountMetric value={0} icon="verified" label="No Movement" accent="navy" surface={surface} />
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-end gap-4"
      aria-label={[
        grid.newlyVerifiedCount > 0
          ? `${grid.newlyVerifiedCount} new verified nodes`
          : null,
        grid.flippedToWeakCount > 0
          ? `${grid.flippedToWeakCount} nodes slipped to weak`
          : null,
      ]
        .filter(Boolean)
        .join("; ")}
    >
      {grid.newlyVerifiedCount > 0 ? (
        <VocabCountMetric
          value={grid.newlyVerifiedCount}
          icon="verified"
          label="New Verified"
          accent="cyan"
          surface={surface}
        />
      ) : null}
      {grid.flippedToWeakCount > 0 ? (
        <VocabCountMetric
          value={grid.flippedToWeakCount}
          icon="focus-ring"
          label="Turned Weak"
          accent="indigo"
          surface={surface}
        />
      ) : null}
      {grid.newlyVerifiedCount > 0 &&
      grid.priorWeekNewlyVerified > 0 &&
      grid.newlyVerifiedCount > grid.priorWeekNewlyVerified ? (
        <VocabCountMetric
          value={`+${grid.newlyVerifiedCount - grid.priorWeekNewlyVerified}`}
          icon="verified"
          label="Weekly Pace"
          accent="violet"
          surface={surface}
          iconSize={22}
        />
      ) : null}
    </div>
  );
}

import { captureMasteryGridSnapshotsBatch } from "@/features/mastery-grid/grid-snapshot-cron";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runCaptureMasteryGridSnapshotsCron() {
  const result = await captureMasteryGridSnapshotsBatch();
  return {
    rows_scanned: result.scanned,
    rows_inserted: result.inserted,
    ...result,
  };
}

export const GET = cronGetHandler(
  "capture-mastery-grid-snapshots",
  runCaptureMasteryGridSnapshotsCron,
);

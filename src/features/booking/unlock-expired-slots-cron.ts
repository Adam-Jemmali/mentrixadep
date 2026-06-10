import { unlockExpiredPendingSlots } from "@/features/booking/cancellation";
import { cronGetHandler } from "@/shared/core/cron-auth";

async function runUnlockExpiredSlotsCron() {
  const result = await unlockExpiredPendingSlots();
  return {
    rows_updated: result.unlocked ?? 0,
    unlocked: result.unlocked,
  };
}

export const GET = cronGetHandler("unlock-expired-slots", runUnlockExpiredSlotsCron);

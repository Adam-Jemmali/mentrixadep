import { NextRequest } from "next/server";
import { unlockExpiredPendingSlots } from "@/app/actions/cancellation";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

/**
 * Cron: unlock availability slots stuck in `pending_payment` after 30 min.
 * Run every 5–10 minutes via cron (Vercel, Railway, or pg_cron).
 *
 * Authorization: Bearer <CRON_SECRET> header.
 */
export async function GET(req: NextRequest) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) return auth.response;

  return runCronJob("unlock-expired-slots", async () => {
    const result = await unlockExpiredPendingSlots();
    return {
      rows_updated: result.unlocked ?? 0,
      unlocked: result.unlocked,
    };
  });
}

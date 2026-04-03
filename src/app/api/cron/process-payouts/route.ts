import { NextRequest } from "next/server";
import { processHeldPayouts } from "@/app/actions/stripe-connect";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

/**
 * Cron: process all held tutor payouts past their 7-day hold window.
 * Run every 4–12 hours via cron (Vercel, Railway, or pg_cron).
 */
export async function GET(req: NextRequest) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) return auth.response;

  return runCronJob("process-payouts", async () => {
    const result = await processHeldPayouts();
    return {
      rows_updated: result.processed ?? 0,
      rows_failed: result.failed ?? 0,
      ...result,
    };
  });
}

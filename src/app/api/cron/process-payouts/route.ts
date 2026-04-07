import { NextRequest } from "next/server";
import { processQueuedPayouts } from "@/app/actions/stripe-connect";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) return auth.response;

  return runCronJob("process-payouts", async () => {
    const result = await processQueuedPayouts();
    return {
      rows_updated: result.processed ?? 0,
      rows_failed: result.failed ?? 0,
      ...result,
    };
  });
}

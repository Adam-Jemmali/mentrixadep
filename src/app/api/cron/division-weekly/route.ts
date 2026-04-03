import { processDivisionWeeklyAwards } from "@/app/actions/division-weekly";
import { authorizeCronRequest, runCronJob } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) return auth.response;

  return runCronJob("division-weekly", async () => {
    const result = await processDivisionWeeklyAwards();
    return {
      rows_updated: result.winnersInserted ?? 0,
      rows_failed: result.errors.length,
      ...result,
    };
  });
}

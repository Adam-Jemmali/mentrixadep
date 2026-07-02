import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";
import { getCurrentMomentumSessionCredit } from "@/features/entitlements/session-credits";
import { utcPeriodMonthKey } from "@/features/entitlements/session-credits-pure";

async function runMomentumDigestCron() {
  const admin = createAdminClient();
  const day = new Date().getUTCDate();
  if (day !== 1) {
    return { skipped: true, reason: "not_first_of_month" };
  }

  const { data: subs } = await admin
    .from("student_subscriptions")
    .select("user_id, local_status")
    .in("local_status", ["active", "trialing"]);

  const userIds = (subs ?? [])
    .filter((row) => isMomentumSubscriptionActive(row as never))
    .map((row) => String(row.user_id));

  const metaByUser = await getCachedUserMetaBatch(userIds);
  let queued = 0;

  for (const userId of userIds) {
    const email = metaByUser[userId]?.email;
    if (!email) continue;

    const credit = await getCurrentMomentumSessionCredit(userId);
    const { count: loopCount } = await admin
      .from("intervention_retests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("completed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    console.log(
      `[momentum-digest] user=${userId} credit=${credit?.credits_remaining ?? 0} loops=${loopCount ?? 0} month=${utcPeriodMonthKey()}`,
    );
    queued += 1;
  }

  return {
    rows_scanned: userIds.length,
    rows_updated: queued,
    digest_month: utcPeriodMonthKey(),
  };
}

export const GET = cronGetHandler("momentum-monthly-digest", runMomentumDigestCron);

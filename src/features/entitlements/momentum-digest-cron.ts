import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";
import { enqueueJobs } from "@/features/jobs/enqueue";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";
import { firstNameFromDisplayName } from "@/features/student-profile/student-dashboard-helpers";
import { movementReceiptDataSchema } from "@/features/movement-receipt/types";
import { buildMonthlyMovementRollup } from "@/features/movement-receipt/movement-receipt-monthly-rollup-pure";

function previousMonthLabel(now: Date = new Date()): { monthKey: string; monthLabel: string } {
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
  const monthKey = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(prev);
  return { monthKey, monthLabel };
}

export async function runMomentumDigestCron(now: Date = new Date()) {
  const day = now.getUTCDate();
  if (day !== 1) {
    return { skipped: true, reason: "not_first_of_month" };
  }

  const admin = createAdminClient();
  const { monthKey, monthLabel } = previousMonthLabel(now);

  const { data: subs } = await admin
    .from("student_subscriptions")
    .select("user_id, local_status")
    .in("local_status", ["active", "trialing"]);

  const userIds = (subs ?? [])
    .filter((row) => isMomentumSubscriptionActive(row as never))
    .map((row) => String(row.user_id));

  const metaByUser = await getCachedUserMetaBatch(userIds);
  const jobs: Parameters<typeof enqueueJobs>[0] = [];
  let rows_scanned = 0;
  let emails_queued = 0;

  for (const userId of userIds) {
    rows_scanned += 1;
    const email = metaByUser[userId]?.email;
    if (!email) continue;

    const { data: receiptRows } = await admin
      .from("movement_receipts")
      .select("receipt_data")
      .eq("student_id", userId)
      .order("week_start", { ascending: false })
      .limit(4);

    const receipts = [];
    for (const row of receiptRows ?? []) {
      const parsed = movementReceiptDataSchema.safeParse(row.receipt_data);
      if (parsed.success) receipts.push(parsed.data);
    }

    const meta = metaByUser[userId];
    const firstName = firstNameFromDisplayName(meta?.displayName ?? null, email);
    const rollup = buildMonthlyMovementRollup({ firstName, monthLabel, receipts });

    jobs.push({
      jobType: "email.send",
      idempotencyKey: `movement_receipt_monthly_rollup:${userId}:${monthKey}`,
      payload: {
        template: "movement_receipt_monthly_rollup",
        to: email,
        data: {
          firstName,
          rollup,
        },
      },
      priority: 2,
    });
    emails_queued += 1;
  }

  if (jobs.length > 0) {
    await enqueueJobs(jobs);
  }

  return {
    rows_scanned,
    emails_queued,
    digest_month: monthKey,
  };
}

export const GET = cronGetHandler("momentum-monthly-digest", () => runMomentumDigestCron());

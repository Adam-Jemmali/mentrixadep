import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";
import { enqueueJobs } from "@/features/jobs/enqueue";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";
import { getCurrentMomentumSessionCredit } from "@/features/entitlements/session-credits";
import { utcPeriodMonthKey } from "@/features/entitlements/session-credits-pure";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { firstNameFromDisplayName } from "@/features/student-profile/student-dashboard-helpers";
import {
  buildCreditEscalationCopy,
  formatCreditExpiryLabel,
  resolveCreditEscalationVariant,
  type CreditEscalationVariant,
} from "@/features/entitlements/credit-escalation-pure";

async function countOpenGuideSlots(): Promise<number> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const twoWeeksIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("tutor_availability")
    .select("id", { count: "exact", head: true })
    .eq("active", true)
    .gte("start_time", nowIso)
    .lte("start_time", twoWeeksIso);

  if (error) return 0;
  return count ?? 0;
}

export async function runCreditEscalationCron(now: Date = new Date()) {
  const variant = resolveCreditEscalationVariant(now);
  if (!variant) {
    return { skipped: true, reason: "not_escalation_day", variant: null };
  }

  const admin = createAdminClient();
  const periodMonth = utcPeriodMonthKey(now);
  const { data: subs } = await admin
    .from("student_subscriptions")
    .select("user_id, local_status")
    .in("local_status", ["active", "trialing"]);

  const userIds = (subs ?? [])
    .filter((row) => isMomentumSubscriptionActive(row as never))
    .map((row) => String(row.user_id));

  const metaByUser = await getCachedUserMetaBatch(userIds);
  const openSlotCount = variant === "credit_nudge" ? await countOpenGuideSlots() : null;

  const jobs: Parameters<typeof enqueueJobs>[0] = [];
  let rows_scanned = 0;
  let emails_queued = 0;

  for (const userId of userIds) {
    rows_scanned += 1;
    const credit = await getCurrentMomentumSessionCredit(userId);
    if (!credit || (credit.credits_remaining ?? 0) <= 0) {
      continue;
    }

    const email = metaByUser[userId]?.email;
    if (!email) continue;

    const meta = metaByUser[userId];
    const firstName = firstNameFromDisplayName(meta?.displayName ?? null, email);

    let weakestNodeName: string | null = null;
    if (variant === "credit_nudge") {
      const weakest = await getWeakestNodes(userId, AP_CALC_AB_SUBJECT, 1).catch(() => []);
      weakestNodeName = weakest[0]?.nodeName ?? null;
    }

    const copy = buildCreditEscalationCopy({
      variant,
      firstName,
      creditsRemaining: credit.credits_remaining,
      periodMonth,
      creditExpiryLabel: formatCreditExpiryLabel(periodMonth),
      weakestNodeName,
      openSlotCount,
    });

    jobs.push({
      jobType: "email.send",
      idempotencyKey: `credit_escalation:${userId}:${periodMonth}:${variant}`,
      payload: {
        template: "credit_escalation",
        to: email,
        data: {
          variant,
          firstName,
          creditsRemaining: credit.credits_remaining,
          periodMonth,
          creditExpiryLabel: formatCreditExpiryLabel(periodMonth),
          weakestNodeName,
          openSlotCount,
          subject: copy.subject,
          verdict: copy.verdict,
          nextAction: copy.nextAction,
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
    variant,
    period_month: periodMonth,
  };
}

export const GET = cronGetHandler("credit-escalation", () => runCreditEscalationCron());

export type { CreditEscalationVariant };

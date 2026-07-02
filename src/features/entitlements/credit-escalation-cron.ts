import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";
import { enqueueJobs } from "@/features/jobs/enqueue";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";
import {
  getMomentumSessionCreditsSummary,
} from "@/features/entitlements/session-credits";
import { buildPackSprintReceiptLine } from "@/features/entitlements/pack-sprint-pure";
import { utcPeriodMonthKey } from "@/features/entitlements/session-credits-pure";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { getWeakestNodes } from "@/features/learning-path/weakest-nodes";
import { firstNameFromDisplayName } from "@/features/student-profile/student-dashboard-helpers";
import {
  buildCreditEscalationCopy,
  formatCreditExpiryLabel,
  resolveCreditEscalationVariantForWeeklyRun,
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
  const variant = resolveCreditEscalationVariantForWeeklyRun(now);
  if (!variant) {
    return { skipped: true, reason: "not_escalation_window", variant: null };
  }

  const admin = createAdminClient();
  const periodMonth = utcPeriodMonthKey(now);
  const { data: subs } = await admin
    .from("student_subscriptions")
    .select("user_id, local_status, plan_tier")
    .eq("plan_tier", "momentum")
    .in("local_status", ["active", "trialing"]);

  const userIds = (subs ?? []).map((row) => String(row.user_id));
  const metaByUser = await getCachedUserMetaBatch(userIds);
  const openSlotCount = variant === "credit_nudge" ? await countOpenGuideSlots() : null;

  const jobs: Parameters<typeof enqueueJobs>[0] = [];
  let rows_scanned = 0;
  let emails_queued = 0;

  for (const userId of userIds) {
    rows_scanned += 1;
    const credits = await getMomentumSessionCreditsSummary(userId);
    if (credits.totalRemaining <= 0) {
      continue;
    }

    const email = metaByUser[userId]?.email;
    if (!email) continue;

    const meta = metaByUser[userId];
    const firstName = firstNameFromDisplayName(meta?.displayName ?? null, email);
    const packSprintLine =
      credits.packSprint && credits.packSprint.creditsRemaining > 0
        ? buildPackSprintReceiptLine(credits.packSprint)
        : null;

    let weakestNodeName: string | null = null;
    if (variant === "credit_nudge") {
      const weakest = await getWeakestNodes(userId, AP_CALC_AB_SUBJECT, 1).catch(() => []);
      weakestNodeName = weakest[0]?.nodeName ?? null;
    }

    const copy = buildCreditEscalationCopy({
      variant,
      firstName,
      creditsRemaining: credits.totalRemaining,
      periodMonth,
      creditExpiryLabel: formatCreditExpiryLabel(periodMonth),
      weakestNodeName,
      openSlotCount,
      packSprintLine,
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
          creditsRemaining: credits.totalRemaining,
          periodMonth,
          creditExpiryLabel: formatCreditExpiryLabel(periodMonth),
          weakestNodeName,
          openSlotCount,
          packSprintLine,
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

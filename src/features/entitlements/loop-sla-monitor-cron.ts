import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { cronGetHandler } from "@/shared/core/cron-auth";
import { enqueueJobs } from "@/features/jobs/enqueue";
import { getCachedUserMetaBatch } from "@/shared/core/user-meta-cache";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";
import { firstNameFromDisplayName } from "@/features/student-profile/student-dashboard-helpers";
import {
  buildLoopSlaGrantCopy,
  isFailedCoachingLoop,
  isLoopSlaEligible,
  loopSlaGrantIdempotencyKey,
} from "@/features/entitlements/loop-sla-pure";
import { grantMomentumSlaMakeGoodCredit } from "@/features/entitlements/session-credits";

const SCAN_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

export async function runLoopSlaMonitorCron(now: Date = new Date()) {
  const admin = createAdminClient();
  const scanSinceIso = new Date(now.getTime() - SCAN_LOOKBACK_MS).toISOString();

  const { data: retests, error } = await admin
    .from("intervention_retests")
    .select(
      "id, user_id, source_id, source_type, skill_node_id, pre_accuracy, post_accuracy, completed_at, skill_nodes!intervention_retests_skill_node_id_fkey(node_name)",
    )
    .eq("source_type", "session")
    .not("completed_at", "is", null)
    .gte("completed_at", scanSinceIso);

  if (error) {
    throw new Error(error.message);
  }

  let rows_scanned = 0;
  let grants_issued = 0;
  const jobs: Parameters<typeof enqueueJobs>[0] = [];
  const emailMetaByUser = new Map<string, { email: string; displayName: string | null }>();

  for (const row of retests ?? []) {
    rows_scanned += 1;
    const completedAt = String(row.completed_at ?? "");
    if (!isLoopSlaEligible(completedAt, now)) continue;

    const pre = row.pre_accuracy == null ? null : Number(row.pre_accuracy);
    const post = row.post_accuracy == null ? null : Number(row.post_accuracy);
    if (!isFailedCoachingLoop(pre, post)) continue;

    const userId = String(row.user_id);
    const sessionId = String(row.source_id);
    const retestId = String(row.id);

    const { data: existingGrant } = await admin
      .from("momentum_sla_grants")
      .select("id")
      .eq("intervention_retest_id", retestId)
      .maybeSingle();
    if (existingGrant) continue;

    const { data: session } = await admin
      .from("sessions")
      .select("id, availability_id, student_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session?.availability_id) continue;

    const { data: redemption } = await admin
      .from("momentum_session_credit_redemptions")
      .select("id, credit_id")
      .eq("user_id", userId)
      .eq("availability_id", session.availability_id)
      .maybeSingle();
    if (!redemption) continue;

    const { data: subscription } = await admin
      .from("student_subscriptions")
      .select("local_status, stripe_status, current_period_end, cancel_at_period_end, billing_interval, mismatch_flagged_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!isMomentumSubscriptionActive(subscription as never)) continue;

    const grantResult = await grantMomentumSlaMakeGoodCredit({ userId });
    if (!grantResult.ok) continue;

    const skillNodes = row.skill_nodes as { node_name: string } | { node_name: string }[] | null;
    const nodeName = Array.isArray(skillNodes)
      ? skillNodes[0]?.node_name ?? "your target node"
      : skillNodes?.node_name ?? "your target node";

    const idempotencyKey = loopSlaGrantIdempotencyKey(retestId);
    const { error: insertError } = await admin.from("momentum_sla_grants").insert({
      user_id: userId,
      intervention_retest_id: retestId,
      session_id: sessionId,
      credit_id: grantResult.creditId,
      skill_node_id: row.skill_node_id,
      pre_accuracy: pre,
      post_accuracy: post,
      idempotency_key: idempotencyKey,
    });

    if (insertError) {
      if (insertError.code === "23505") continue;
      throw new Error(insertError.message);
    }

    grants_issued += 1;

    let meta = emailMetaByUser.get(userId);
    if (!meta) {
      const batch = await getCachedUserMetaBatch([userId]);
      const email = batch[userId]?.email;
      if (!email) continue;
      meta = { email, displayName: batch[userId]?.displayName ?? null };
      emailMetaByUser.set(userId, meta);
    }

    const firstName = firstNameFromDisplayName(meta.displayName, meta.email);
    const copy = buildLoopSlaGrantCopy({ firstName, nodeName });
    jobs.push({
      jobType: "email.send",
      idempotencyKey: `loop_sla_grant_email:${retestId}`,
      payload: {
        template: "loop_sla_grant",
        to: meta.email,
        data: {
          firstName,
          nodeName,
          subject: copy.subject,
          verdict: copy.verdict,
          nextAction: copy.nextAction,
        },
      },
      priority: 2,
    });
    await admin
      .from("momentum_sla_grants")
      .update({ email_sent_at: now.toISOString() })
      .eq("intervention_retest_id", retestId);
  }

  if (jobs.length > 0) {
    await enqueueJobs(jobs);
  }

  return { rows_scanned, grants_issued };
}

export const GET = cronGetHandler("loop-sla-monitor", () => runLoopSlaMonitorCron());

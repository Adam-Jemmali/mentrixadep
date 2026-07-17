import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { resolveMasteryNodeState } from "@/features/mastery-grid/mastery-grid-pure";
import {
  daysSinceProof,
  decayAlertPushCopy,
  decayAlertQuestUrl,
  hoursUntilDecay,
  isDecayAlertEligibleState,
  isWithinDecayAlertWindow,
  shouldSendDecayAlert,
} from "@/features/mastery-decay/decay-alerts-pure";
import { sendWebPushToUser } from "@/shared/integrations/web-push/send-web-push";

const PAGE = 500;

/**
 * Daily pre-decay scan. Upserts at-risk nodes and pushes when the alert is due.
 */
export async function runCheckMasteryDecay(now = new Date()): Promise<{
  scanned: number;
  upserted: number;
  pushed: number;
  skipped: number;
}> {
  const admin = createAdminClient();
  const nowIso = now.toISOString();
  const windowEndIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  let scanned = 0;
  let upserted = 0;
  let pushed = 0;
  let skipped = 0;
  let offset = 0;

  for (;;) {
    const { data: rows, error } = await admin
      .from("student_knowledge_nodes")
      .select(
        "user_id, skill_node_id, attempts, correct, last_seen_at, next_review_at",
      )
      .not("skill_node_id", "is", null)
      .not("next_review_at", "is", null)
      .gt("next_review_at", nowIso)
      .lte("next_review_at", windowEndIso)
      .order("next_review_at", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error("[check-mastery-decay]", error.message);
      break;
    }

    if (!rows?.length) break;

    const skillIds = Array.from(
      new Set(rows.map((r) => String(r.skill_node_id)).filter(Boolean)),
    );
    const userIds = Array.from(new Set(rows.map((r) => String(r.user_id))));

    const [{ data: skillNodes }, { data: vfaRows }, { data: existingAlerts }] =
      await Promise.all([
        admin.from("skill_nodes").select("id, node_name").in("id", skillIds),
        admin
          .from("verified_first_attempts")
          .select("user_id, skill_node_id, is_correct, attempted_at")
          .in("user_id", userIds)
          .in("skill_node_id", skillIds),
        admin
          .from("mastery_decay_alerts")
          .select("user_id, skill_node_id, alert_sent_at")
          .in("user_id", userIds)
          .in("skill_node_id", skillIds),
      ]);

    const nodeNameById = new Map(
      (skillNodes ?? []).map((n) => [String(n.id), String(n.node_name)]),
    );
    const vfaKey = (userId: string, nodeId: string) => `${userId}:${nodeId}`;
    const vfaByKey = new Map<
      string,
      { isCorrect: boolean; attemptedAt: string | null }
    >();
    for (const row of vfaRows ?? []) {
      vfaByKey.set(vfaKey(String(row.user_id), String(row.skill_node_id)), {
        isCorrect: row.is_correct === true,
        attemptedAt: row.attempted_at ? String(row.attempted_at) : null,
      });
    }
    const alertByKey = new Map<string, string | null>();
    for (const row of existingAlerts ?? []) {
      alertByKey.set(
        vfaKey(String(row.user_id), String(row.skill_node_id)),
        row.alert_sent_at ? String(row.alert_sent_at) : null,
      );
    }

    for (const row of rows) {
      scanned += 1;
      const userId = String(row.user_id);
      const skillNodeId = String(row.skill_node_id ?? "");
      if (!skillNodeId || !row.next_review_at) {
        skipped += 1;
        continue;
      }

      const nextReviewAt = new Date(String(row.next_review_at));
      if (!isWithinDecayAlertWindow(nextReviewAt, now)) {
        skipped += 1;
        continue;
      }

      const vfa = vfaByKey.get(vfaKey(userId, skillNodeId)) ?? null;
      const resolved = resolveMasteryNodeState(
        vfa ? { isCorrect: vfa.isCorrect } : null,
        {
          attempts: Number(row.attempts ?? 0),
          correct: Number(row.correct ?? 0),
        },
      );

      if (!isDecayAlertEligibleState(resolved.state)) {
        skipped += 1;
        continue;
      }

      const hoursLeft = hoursUntilDecay(nextReviewAt, now);
      const { error: upsertError } = await admin.from("mastery_decay_alerts").upsert(
        {
          user_id: userId,
          skill_node_id: skillNodeId,
          current_state: resolved.state,
          hours_until_decay: hoursLeft,
          updated_at: nowIso,
        },
        { onConflict: "user_id,skill_node_id" },
      );

      if (upsertError) {
        console.error("[check-mastery-decay upsert]", upsertError.message);
        skipped += 1;
        continue;
      }
      upserted += 1;

      const priorSent = alertByKey.get(vfaKey(userId, skillNodeId));
      if (!shouldSendDecayAlert(priorSent, now)) {
        skipped += 1;
        continue;
      }

      const nodeName = nodeNameById.get(skillNodeId) ?? "This skill";
      const proofIso =
        vfa?.attemptedAt ??
        (row.last_seen_at ? String(row.last_seen_at) : nowIso);
      const daysAgo = daysSinceProof(new Date(proofIso), now);
      const copy = decayAlertPushCopy({
        nodeName,
        daysAgo,
        hoursLeft,
      });

      const pushResult = await sendWebPushToUser(userId, {
        title: copy.title,
        body: copy.body,
        url: decayAlertQuestUrl(nodeName),
      });

      await admin
        .from("mastery_decay_alerts")
        .update({ alert_sent_at: nowIso, updated_at: nowIso })
        .eq("user_id", userId)
        .eq("skill_node_id", skillNodeId);

      if (pushResult.sent > 0) pushed += 1;
      alertByKey.set(vfaKey(userId, skillNodeId), nowIso);
    }

    if (rows.length < PAGE) break;
    offset += PAGE;
  }

  return { scanned, upserted, pushed, skipped };
}

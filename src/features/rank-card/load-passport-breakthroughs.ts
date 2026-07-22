import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { MASTERY_STATE_LABEL } from "@/features/mastery-grid/mastery-grid-pure";
import {
  formatPassportReceiptDate,
  practiceAccuracyToMasteryStateLabel,
} from "@/features/rank-card/rank-passport-pure";
import type { RankPassportReceipt } from "@/features/rank-card/types";
import { preSessionWasNotCorrect } from "@/features/breakthrough-events/post-session-retest";

type SkillNodeRef = { node_name: string };

function resolveNodeName(skillNodes: SkillNodeRef | SkillNodeRef[] | null): string {
  if (!skillNodes) return "Skill node";
  if (Array.isArray(skillNodes)) return skillNodes[0]?.node_name ?? "Skill node";
  return skillNodes.node_name;
}

function receiptKey(receipt: RankPassportReceipt): string {
  return `${receipt.nodeName}:${receipt.date}:${receipt.beforeState}:${receipt.afterState}`;
}

export async function loadPassportBreakthroughReceipts(
  studentId: string
): Promise<RankPassportReceipt[]> {
  const admin = createAdminClient();
  const receipts: RankPassportReceipt[] = [];
  const seen = new Set<string>();

  const push = (receipt: RankPassportReceipt) => {
    const key = receiptKey(receipt);
    if (seen.has(key)) return;
    seen.add(key);
    receipts.push(receipt);
  };

  const { data: events } = await admin
    .from("breakthrough_events")
    .select("concept, accuracy_before, accuracy_after, detected_at, subject")
    .eq("student_id", studentId)
    .order("detected_at", { ascending: false })
    .limit(12);

  for (const event of events ?? []) {
    if (!isApCalculusAbSubject(String(event.subject))) continue;
    const before = Number(event.accuracy_before);
    const after = Number(event.accuracy_after);
    if (!Number.isFinite(before) || !Number.isFinite(after) || after <= before) continue;
    push({
      nodeName: String(event.concept),
      beforeState: practiceAccuracyToMasteryStateLabel(before),
      afterState: practiceAccuracyToMasteryStateLabel(after),
      date: formatPassportReceiptDate(String(event.detected_at)),
      prePercent: Math.round(before),
      postPercent: Math.round(after),
    });
    if (receipts.length >= 3) return receipts;
  }

  const { data: vfaRows } = await admin
    .from("verified_first_attempts")
    .select("is_correct, created_at, skill_nodes(node_name)")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(12);

  for (const row of vfaRows ?? []) {
    if (receipts.length >= 3) break;
    const nodeName = resolveNodeName(row.skill_nodes as SkillNodeRef | SkillNodeRef[] | null);
    push({
      nodeName,
      beforeState: MASTERY_STATE_LABEL.none,
      afterState: row.is_correct ? MASTERY_STATE_LABEL.verified : MASTERY_STATE_LABEL.weak,
      date: formatPassportReceiptDate(String(row.created_at)),
    });
  }

  if (receipts.length >= 3) return receipts.slice(0, 3);

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, course, end_time")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .order("end_time", { ascending: false })
    .limit(8);

  for (const session of sessions ?? []) {
    if (!isApCalculusAbSubject(String(session.course))) continue;
    if (receipts.length >= 3) break;

    const { data: targets } = await admin
      .from("session_target_nodes")
      .select(
        "pre_session_correct, post_session_correct, skill_nodes!session_target_nodes_skill_node_id_fkey(node_name)"
      )
      .eq("session_id", session.id);

    for (const target of targets ?? []) {
      if (receipts.length >= 3) break;
      const pre = target.pre_session_correct;
      const post = target.post_session_correct;
      if (!preSessionWasNotCorrect(pre) || post !== true) continue;
      push({
        nodeName: resolveNodeName(
          target.skill_nodes as SkillNodeRef | SkillNodeRef[] | null
        ),
        beforeState: MASTERY_STATE_LABEL.weak,
        afterState: MASTERY_STATE_LABEL.proficient,
        date: formatPassportReceiptDate(String(session.end_time)),
      });
    }
  }

  return receipts.slice(0, 3);
}

import {
  sendPreSessionBriefEmail,
  sendSessionReminderStudentEmail,
  sendSessionReminderTutorEmail,
  sendProgressSnapshotEmail,
  sendMovementReceiptEmail,
  sendMovementReceiptMonthlyRollupEmail,
  sendCreditEscalationEmail,
  sendLoopSlaGrantEmail,
  sendBreakthroughGuideEmail,
  type PreSessionBriefEmailData,
  type SessionEmailDetails,
} from "@/shared/integrations/email";
import { sendEmail } from "@/shared/integrations/email/shared";
import type { EmailJobPayload } from "@/features/jobs/types";
import { getSiteUrl } from "@/shared/core/site";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { progressSnapshotDataSchema } from "@/features/progress-snapshot/types";
import { movementReceiptDataSchema } from "@/features/movement-receipt/types";
import { z } from "zod";

const verdictEmailSchema = z.object({
  changed: z.string(),
  reason: z.string(),
  nextAction: z.object({
    label: z.string(),
    href: z.string(),
  }),
});

export async function handleEmailJob(payload: EmailJobPayload): Promise<void> {
  const { template, to, data } = payload;
  if (!to) throw new Error("email.send: missing recipient");

  switch (template) {
    case "session_reminder_tutor": {
      const details = data as unknown as SessionEmailDetails;
      await sendSessionReminderTutorEmail(to, details);
      return;
    }
    case "session_reminder_student": {
      const details = data as unknown as SessionEmailDetails;
      await sendSessionReminderStudentEmail(to, {
        ...details,
        preSessionBriefUrl: `${getSiteUrl()}/student`,
      });
      return;
    }
    case "pre_session_brief": {
      await sendPreSessionBriefEmail(to, data as unknown as PreSessionBriefEmailData);
      return;
    }
    case "progress_snapshot": {
      const snapshotId = String(data.snapshotId ?? "");
      const snapshotRaw = data.snapshot;
      const parsed = progressSnapshotDataSchema.safeParse(snapshotRaw);
      if (!parsed.success) throw new Error("progress_snapshot: invalid snapshot data");
      const weeklyVerdictParsed = verdictEmailSchema.safeParse(data.weeklyVerdict);
      const truthReportParsed = z
        .object({
          moved: z.string(),
          cause: z.string(),
          stuck: z.string(),
          nextAction: z.string(),
        })
        .safeParse(data.truthReport);
      await sendProgressSnapshotEmail(to, {
        snapshot: parsed.data,
        weeklyVerdict: weeklyVerdictParsed.success ? weeklyVerdictParsed.data : null,
        truthReport: truthReportParsed.success ? truthReportParsed.data : null,
      });
      if (snapshotId) {
        const admin = createAdminClient();
        await admin
          .from("progress_snapshots")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", snapshotId);
      }
      return;
    }
    case "movement_receipt": {
      const receiptId = String(data.receiptId ?? "");
      const parsed = movementReceiptDataSchema.safeParse(data.receipt);
      if (!parsed.success) throw new Error("movement_receipt: invalid receipt data");
      await sendMovementReceiptEmail(to, { receipt: parsed.data });
      if (receiptId) {
        const admin = createAdminClient();
        await admin
          .from("movement_receipts")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", receiptId);
      }
      return;
    }
    case "movement_receipt_monthly_rollup": {
      await sendMovementReceiptMonthlyRollupEmail(to, {
        firstName: String(data.firstName ?? "Student"),
        rollup: data.rollup as never,
      });
      return;
    }
    case "credit_escalation": {
      await sendCreditEscalationEmail(to, {
        variant: data.variant as never,
        firstName: String(data.firstName ?? "Student"),
        creditsRemaining: Number(data.creditsRemaining ?? 0),
        periodMonth: String(data.periodMonth ?? ""),
        creditExpiryLabel: String(data.creditExpiryLabel ?? ""),
        weakestNodeName:
          typeof data.weakestNodeName === "string" ? data.weakestNodeName : null,
        openSlotCount: data.openSlotCount == null ? null : Number(data.openSlotCount),
      });
      return;
    }
    case "loop_sla_grant": {
      await sendLoopSlaGrantEmail(to, {
        firstName: String(data.firstName ?? "Student"),
        nodeName: String(data.nodeName ?? "your target node"),
        subject: String(data.subject ?? ""),
        verdict: String(data.verdict ?? ""),
        nextAction: String(data.nextAction ?? ""),
      });
      return;
    }
    case "breakthrough_guide": {
      await sendBreakthroughGuideEmail(to, {
        studentName: String(data.studentName ?? "Student"),
        concept: String(data.concept ?? "concept"),
        accuracyBefore: Number(data.accuracyBefore ?? 0),
        accuracyAfter: Number(data.accuracyAfter ?? 0),
        course: typeof data.course === "string" ? data.course : undefined,
      });
      return;
    }
    case "raw": {
      const subject = String(data.subject ?? "");
      const html = String(data.html ?? "");
      if (!subject || !html) throw new Error("email.send raw: missing subject/html");
      const ok = await sendEmail(to, subject, html);
      if (!ok) throw new Error("Failed to send raw email");
      return;
    }
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}

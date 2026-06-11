import {
  sendPreSessionBriefEmail,
  sendSessionReminderStudentEmail,
  sendSessionReminderTutorEmail,
  sendProgressSnapshotEmail,
  sendBreakthroughGuideEmail,
  type PreSessionBriefEmailData,
  type SessionEmailDetails,
} from "@/shared/integrations/email";
import { sendEmail } from "@/shared/integrations/email/shared";
import type { EmailJobPayload } from "@/features/jobs/types";
import { getSiteUrl } from "@/shared/core/site";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { progressSnapshotDataSchema } from "@/features/progress-snapshot/types";

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
      await sendProgressSnapshotEmail(to, { snapshot: parsed.data });
      if (snapshotId) {
        const admin = createAdminClient();
        await admin
          .from("progress_snapshots")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", snapshotId);
      }
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

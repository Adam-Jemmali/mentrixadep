import {
  sendPreSessionBriefEmail,
  sendSessionReminderStudentEmail,
  sendSessionReminderTutorEmail,
  type PreSessionBriefEmailData,
  type SessionEmailDetails,
} from "@/shared/integrations/email";
import { sendEmail } from "@/shared/integrations/email/shared";
import type { EmailJobPayload } from "@/features/jobs/types";
import { getSiteUrl } from "@/shared/core/site";

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

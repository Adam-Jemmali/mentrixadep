import { generateAndStorePreSessionBrief } from "@/features/pre-session-brief/brief";
import type { BriefJobPayload } from "@/features/jobs/types";

export async function handleBriefJob(payload: BriefJobPayload): Promise<void> {
  const result = await generateAndStorePreSessionBrief({
    sessionId: payload.sessionId,
    studentId: payload.studentId,
    studentEmail: payload.studentEmail,
    studentDisplayName: payload.studentDisplayName,
    course: payload.course,
    startTime: payload.startTime,
    endTime: payload.endTime,
    durationMinutes: payload.durationMinutes,
    sendEmail: payload.sendEmail ?? true,
  });

  if (!result.ok) {
    throw new Error(result.reason ?? "Brief generation failed");
  }
}

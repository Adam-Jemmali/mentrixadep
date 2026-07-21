import {
  resolveRetestNotificationTone,
  type RetestNotificationTone,
} from "@/features/notifications/notification-card-pure";

export function buildStudentRetestPushTitle(nodeName: string): string {
  const skill = nodeName.trim() || "Skill";
  return `${skill} retest complete`;
}

export function buildStudentRetestPushBody(preAccuracy: number, postAccuracy: number): string {
  const pre = Math.round(Number(preAccuracy ?? 0));
  const post = Math.round(Number(postAccuracy ?? 0));
  return `Your accuracy moved from ${pre}% to ${post}%`;
}

export function buildGuideInterventionRetestNotificationBody(params: {
  studentName: string;
  nodeName: string;
  preAccuracy: number;
  postAccuracy: number;
  delta: number;
}): string {
  const delta = Number(params.delta ?? 0);
  const node = params.nodeName.trim() || "this skill";

  if (delta < 0) {
    return `Consider a different approach on ${node}.`;
  }

  if (delta >= 10) {
    const student = params.studentName.trim() || "Your student";
    const pre = Math.round(Number(params.preAccuracy ?? 0));
    const post = Math.round(Number(params.postAccuracy ?? 0));
    return `${student} accuracy on ${node} moved from ${pre}% to ${post}% after your session.`;
  }

  const student = params.studentName.trim() || "Your student";
  const pre = Math.round(Number(params.preAccuracy ?? 0));
  const post = Math.round(Number(params.postAccuracy ?? 0));
  return `${student} accuracy on ${node} moved from ${pre}% to ${post}%.`;
}

export function resolveGuideRetestNotificationTone(delta: number): RetestNotificationTone {
  return resolveRetestNotificationTone(delta);
}

export function buildGuideInterventionRetestNotificationBody(params: {
  studentName: string;
  nodeName: string;
  preAccuracy: number;
  postAccuracy: number;
}): string {
  const student = params.studentName.trim() || "your student";
  const node = params.nodeName.trim() || "the skill node";
  const pre = Math.round(Number(params.preAccuracy ?? 0));
  const post = Math.round(Number(params.postAccuracy ?? 0));

  if (post > pre) {
    return `${student} accuracy on ${node} moved from ${pre}% to ${post}% after your session and package`;
  }

  return `${student} accuracy on ${node} did not move. Consider addressing it differently next session.`;
}

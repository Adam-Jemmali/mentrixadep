export function buildGuideInterventionRetestNotificationBody(params: {
  studentName: string;
  nodeName: string;
  delta: number;
}): string {
  const student = params.studentName.trim() || "your student";
  const node = params.nodeName.trim() || "the skill node";
  const delta = Number.isFinite(params.delta) ? params.delta : 0;

  if (delta > 0) {
    return `Your session with ${student} improved their first-answer accuracy on ${node} by ${Math.round(Math.abs(delta))} percentage points`;
  }

  return `Your session with ${student} did not move their accuracy on ${node}. Consider a different approach next time.`;
}

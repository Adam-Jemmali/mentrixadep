import { escapeHtml, APP_URL } from "../shared";
import { ctaButton } from "../templates";

export type BreakthroughGuideEmailProps = {
  studentName: string;
  concept: string;
  accuracyBefore: number;
  accuracyAfter: number;
  course?: string;
};

export function breakthroughGuideEmailSubject(props: BreakthroughGuideEmailProps): string {
  return `${props.studentName} broke through ${props.concept}`;
}

export function breakthroughGuideEmailTitle(): string {
  return "Student breakthrough";
}

export function breakthroughGuideEmailBody(props: BreakthroughGuideEmailProps): string {
  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;"><strong style="color:#eee;">${escapeHtml(props.studentName)}</strong> just broke through <strong style="color:#D4A017;">${escapeHtml(props.concept)}</strong>${props.course ? ` in ${escapeHtml(props.course)}` : ""}.</p>
    <p style="color:#e5e5e5;font-size:18px;font-weight:700;margin:0 0 16px;">${props.accuracyBefore}% → ${props.accuracyAfter}%</p>
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 20px;">Your Impact Score reflects real accuracy movement — this breakthrough is now part of their verified record.</p>
    ${ctaButton(`${APP_URL}/tutor`, "View command center")}`;
}

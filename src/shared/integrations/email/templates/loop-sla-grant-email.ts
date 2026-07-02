import { escapeHtml, APP_URL } from "../shared";
import { ctaButton } from "../templates";

export type LoopSlaGrantEmailProps = {
  firstName: string;
  nodeName: string;
  subject: string;
  verdict: string;
  nextAction: string;
};

export function loopSlaGrantEmailSubject(props: LoopSlaGrantEmailProps): string {
  return props.subject;
}

export function loopSlaGrantEmailTitle(_props: LoopSlaGrantEmailProps): string {
  return "Loop SLA credit restored";
}

export function loopSlaGrantEmailBody(props: LoopSlaGrantEmailProps): string {
  const href = `${APP_URL}/student#browse-guides`;
  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 16px;">Hi <strong style="color:#eee;">${escapeHtml(props.firstName)}</strong>,</p>
    <div style="margin:0 0 20px;padding:16px 18px;border:1px solid #333;border-radius:12px;background:#141414;">
      <p style="margin:0 0 10px;color:#f5f5f5;font-size:16px;line-height:1.55;font-weight:600;">${escapeHtml(props.verdict)}</p>
      <p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">${escapeHtml(props.nextAction)}</p>
    </div>
    ${ctaButton(href, "Book your make-good session")}
    <p style="margin:20px 0 0;color:#525252;font-size:12px;line-height:1.55;text-align:center;">Momentum Loop SLA: included session credit restored when verified movement does not improve within 7 days.</p>`;
}

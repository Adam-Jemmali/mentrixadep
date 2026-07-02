import { escapeHtml, APP_URL } from "../shared";
import { ctaButton } from "../templates";
import type { CreditEscalationEmailData } from "@/features/entitlements/credit-escalation-pure";
import { buildCreditEscalationCopy } from "@/features/entitlements/credit-escalation-pure";

export type CreditEscalationEmailTemplateProps = CreditEscalationEmailData;

export function creditEscalationEmailSubject(props: CreditEscalationEmailTemplateProps): string {
  return buildCreditEscalationCopy(props).subject;
}

export function creditEscalationEmailTitle(_props: CreditEscalationEmailTemplateProps): string {
  return "Momentum session credit";
}

export function creditEscalationEmailBody(props: CreditEscalationEmailTemplateProps): string {
  const hi = props.firstName;
  const { verdict, nextAction } = buildCreditEscalationCopy(props);
  const href = `${APP_URL}/student#browse-guides`;

  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 16px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <div style="margin:0 0 20px;padding:16px 18px;border:1px solid #333;border-radius:12px;background:#141414;">
      <p style="margin:0 0 10px;color:#f5f5f5;font-size:16px;line-height:1.55;font-weight:600;">${escapeHtml(verdict)}</p>
      <p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">${escapeHtml(nextAction)}</p>
    </div>
    ${ctaButton(href, "Book a Guide session")}
    <p style="margin:20px 0 0;color:#525252;font-size:12px;line-height:1.55;text-align:center;">Included with Momentum. Your rank stays free; your trajectory is Momentum.</p>`;
}

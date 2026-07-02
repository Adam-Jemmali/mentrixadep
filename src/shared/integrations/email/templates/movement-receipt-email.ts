import { escapeHtml, APP_URL } from "../shared";
import { ctaButton } from "../templates";
import type { MovementReceiptData } from "@/features/movement-receipt/types";
import {
  buildMovementReceiptDetailLines,
  buildMovementReceiptVerdict,
  movementReceiptEmailSubject,
} from "@/features/movement-receipt/movement-receipt-pure";

export type MovementReceiptEmailTemplateProps = {
  receipt: MovementReceiptData;
};

export function movementReceiptEmailSubjectLine(props: MovementReceiptEmailTemplateProps): string {
  return movementReceiptEmailSubject(props.receipt);
}

export function movementReceiptEmailTitle(_props: MovementReceiptEmailTemplateProps): string {
  return "Your weekly Movement Receipt";
}

export function movementReceiptEmailBody(props: MovementReceiptEmailTemplateProps): string {
  const receipt = props.receipt;
  const hi = receipt.firstName;
  const { verdict, nextAction, ctaHref, ctaLabel } = buildMovementReceiptVerdict(receipt);
  const href = ctaHref.startsWith("http") ? ctaHref : `${APP_URL}${ctaHref}`;
  const detailLines = buildMovementReceiptDetailLines(receipt);

  const detailRows = detailLines
    .map(
      (line) =>
        `<tr><td colspan="2" style="padding:8px 0;border-bottom:1px solid #222;color:#d4d4d4;font-size:14px;line-height:1.55;">${escapeHtml(line)}</td></tr>`,
    )
    .join("");

  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 16px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <div style="margin:0 0 20px;padding:16px 18px;border:1px solid #333;border-radius:12px;background:#141414;">
      <p style="margin:0 0 10px;color:#f5f5f5;font-size:16px;line-height:1.55;font-weight:600;">${escapeHtml(verdict)}</p>
      <p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">${escapeHtml(nextAction)}</p>
    </div>
    <p style="color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px;">This week</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;border-collapse:collapse;">
      ${detailRows}
    </table>
    ${ctaButton(href, ctaLabel)}
    <p style="margin:20px 0 0;color:#525252;font-size:12px;line-height:1.55;text-align:center;">Momentum members receive this every Monday. Your rank stays free; your trajectory is Momentum.</p>`;
}

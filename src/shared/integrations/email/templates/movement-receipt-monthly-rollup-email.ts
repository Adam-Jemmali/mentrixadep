import { escapeHtml, APP_URL } from "../shared";
import { ctaButton } from "../templates";
import type { MonthlyMovementRollup } from "@/features/movement-receipt/movement-receipt-monthly-rollup-pure";

export type MovementReceiptMonthlyRollupEmailProps = {
  firstName: string;
  rollup: MonthlyMovementRollup;
};

export function movementReceiptMonthlyRollupEmailSubject(
  props: MovementReceiptMonthlyRollupEmailProps,
): string {
  return `${props.firstName} — your ${props.rollup.monthLabel} Movement Receipt rollup`;
}

export function movementReceiptMonthlyRollupEmailTitle(
  _props: MovementReceiptMonthlyRollupEmailProps,
): string {
  return "Your monthly Movement Receipt rollup";
}

export function movementReceiptMonthlyRollupEmailBody(
  props: MovementReceiptMonthlyRollupEmailProps,
): string {
  const hi = props.firstName;
  const rollup = props.rollup;
  const href = `${APP_URL}/student/receipts`;

  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 16px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <div style="margin:0 0 20px;padding:16px 18px;border:1px solid #333;border-radius:12px;background:#141414;">
      <p style="margin:0 0 10px;color:#f5f5f5;font-size:16px;line-height:1.55;font-weight:600;">${escapeHtml(rollup.verdict)}</p>
      <p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">${escapeHtml(rollup.nextAction)}</p>
    </div>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;border-collapse:collapse;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #222;color:#888;font-size:13px;">Weeks</td><td style="padding:8px 0;border-bottom:1px solid #222;color:#f5f5f5;font-size:14px;">${rollup.weeksIncluded}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #222;color:#888;font-size:13px;">New verified</td><td style="padding:8px 0;border-bottom:1px solid #222;color:#f5f5f5;font-size:14px;">${rollup.totalNewVerified}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #222;color:#888;font-size:13px;">Loops closed</td><td style="padding:8px 0;border-bottom:1px solid #222;color:#f5f5f5;font-size:14px;">${rollup.totalLoopsClosed}</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:13px;">Unused credit weeks</td><td style="padding:8px 0;color:#f5f5f5;font-size:14px;">${rollup.weeksWithUnusedCredit}</td></tr>
    </table>
    ${ctaButton(href, "Open receipt archive")}
    <p style="margin:20px 0 0;color:#525252;font-size:12px;line-height:1.55;text-align:center;">Momentum members receive weekly Movement Receipts every Monday.</p>`;
}

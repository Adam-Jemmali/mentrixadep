/**
 * Marketing email body builders — pure HTML, unit-testable without Resend.
 */

import {
  escapeHtml,
  greetingFirstName,
  formatPriceUsd,
  APP_URL,
  EMAIL_ASSET_ORIGIN,
  DEFAULT_PUBLIC_FEEDBACK_EMAIL,
} from "../shared";
import { detailRow, ctaButton } from "../templates";

export type WelcomeStudentEmailBodyProps = {
  hi: string;
  firstSessionBonusXp: number;
};

export function welcomeStudentEmailBody(props: WelcomeStudentEmailBodyProps): string {
  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(props.hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Welcome to Mentrixa. You're a <strong style="color:#eee;">Learner</strong> here — we match you with expert Guides for live sessions and turn every hour into practice you can keep.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:14px 16px;background:#161616;border:1px solid #262626;border-radius:8px;">
          <p style="margin:0 0 8px;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Your first session</p>
          <ol style="margin:0;padding-left:18px;color:#a3a3a3;font-size:14px;line-height:1.55;">
            <li style="margin:0 0 6px;">Pick a course and browse Guide availability.</li>
            <li style="margin:0 0 6px;">Book a slot — you'll get a calendar confirmation and a Pre‑Session Brief before you meet.</li>
            <li style="margin:0;">Join from Mentrixa video when it's time.</li>
          </ol>
        </td>
      </tr>
    </table>
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 20px;">Complete your <strong style="color:#e5e5e5;">first session</strong> and earn <strong style="color:#e5e5e5;">+${props.firstSessionBonusXp} XP</strong> toward your account level — small nudge, real momentum.</p>
    ${ctaButton(`${APP_URL}/student`, "Book your first session")}`;
}

export type WelcomeTutorEmailBodyProps = {
  hi: string;
  payoutSetupUrl: string;
};

export function welcomeTutorEmailBody(props: WelcomeTutorEmailBodyProps): string {
  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(props.hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Welcome to Mentrixa as a <strong style="color:#eee;">Guide</strong>. Learners book you for live sessions; you stay in control of your availability and your payouts.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:14px 16px;background:#161616;border:1px solid #262626;border-radius:8px;">
          <p style="margin:0 0 8px;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Onboarding checklist</p>
          <ul style="margin:0;padding-left:18px;color:#a3a3a3;font-size:14px;line-height:1.55;">
            <li style="margin:0 0 6px;">Set your subjects and weekly availability.</li>
            <li style="margin:0 0 6px;">Complete Stripe Connect onboarding to receive payouts.</li>
            <li style="margin:0;">Respond to booking requests from your tutor home.</li>
          </ul>
        </td>
      </tr>
    </table>
    ${ctaButton(props.payoutSetupUrl, "Set up payouts")}`;
}

export function waitlistReceivedEmailBody(hi: string, roleLabel: string): string {
  return `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">
      Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
    </p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">
      You're in Mentrixa onboarding as a <strong style="color:#eee;">${escapeHtml(roleLabel)}</strong>.
      Continue with account setup using this email. Check spam if you do not see our message.
    </p>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 20px;">
      Until approval, sign in and sign up stay locked for this email.
    </p>
    ${ctaButton(`${APP_URL}/`, "Back to Mentrixa")}
  `;
}

export function waitlistApprovedEmailBody(hi: string, roleLabel: string, email: string, role: "student" | "tutor"): string {
  return `
      <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">
        Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
      </p>
      <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">
        Great news! Your access as a <strong style="color:#eee;">${escapeHtml(roleLabel)}</strong> is approved.
        You can now sign up or sign in to Mentrixa with this email.
      </p>
      ${ctaButton(`${APP_URL}/auth/activate?email=${encodeURIComponent(email)}&role=${role === "tutor" ? "tutor" : "student"}&google=1`, "Continue to Mentrixa", {
        openInNewTab: true,
      })}
    `;
}

export function waitlistRejectedEmailBody(hi: string, roleLabel: string): string {
  return `
      <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">
        Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
      </p>
      <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">
        Your access request as a <strong style="color:#eee;">${escapeHtml(roleLabel)}</strong> was not approved.
      </p>
      <p style="color:#737373;font-size:13px;line-height:1.55;margin:0 0 20px;">
        If you believe this is a mistake, please contact us at <a href="mailto:support@mentrixa.one" style="color:#60a5fa;">support@mentrixa.one</a>.
      </p>
    `;
}

export type LevelUpEmailBodyProps = {
  hi: string;
  newLevelTitle: string;
  totalXp: number;
  badgeImageUrl: string;
};

export function levelUpEmailBody(props: LevelUpEmailBodyProps): string {
  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(props.hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 16px;">You reached <strong style="color:#eee;">${escapeHtml(props.newLevelTitle)}</strong> — ${props.totalXp.toLocaleString("en-US")} total XP. Keep the streak going.</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;border-collapse:collapse;">
      <tr>
        <td style="text-align:center;padding:16px 24px;background:#161616;border:1px solid #262626;border-radius:8px;">
          <img src="${props.badgeImageUrl}" alt="" width="72" height="72" style="display:block;margin:0 auto 12px;" />
          <p style="margin:0;color:#e5e5e5;font-size:16px;font-weight:600;">${escapeHtml(props.newLevelTitle)}</p>
        </td>
      </tr>
    </table>
    ${ctaButton(`${APP_URL}/student`, "See your progress")}`;
}

export function levelUpBadgeImageUrl(customUrl?: string): string {
  return customUrl ?? `${EMAIL_ASSET_ORIGIN}/mentrixa-checkout-icon.svg`;
}

export type DuelChallengeEmailBodyProps = {
  hi: string;
  challengerDisplayName: string;
  duelId: string;
  divisionLabel?: string | null;
};

export function duelChallengeEmailBody(props: DuelChallengeEmailBodyProps): string {
  const div = props.divisionLabel?.trim();
  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(props.hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;"><strong style="color:#eee;">${escapeHtml(props.challengerDisplayName)}</strong> challenged you to a skill duel${div ? ` in <strong style="color:#eee;">${escapeHtml(div)}</strong>` : ""}. Accept from Mentrixa to lock the match.</p>
    ${ctaButton(`${APP_URL}/student/duel/${props.duelId}`, "View duel")}`;
}

export type ReferralSuccessEmailBodyProps = {
  hi: string;
  xpAwarded: number;
  friendDisplayName?: string | null;
};

export function referralSuccessEmailBody(props: ReferralSuccessEmailBodyProps): string {
  const friend = props.friendDisplayName?.trim();
  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(props.hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">${friend ? `<strong style="color:#eee;">${escapeHtml(friend)}</strong> joined Mentrixa through your referral.` : "A friend joined Mentrixa through your referral."} You earned <strong style="color:#eee;">+${props.xpAwarded.toLocaleString("en-US")} XP</strong>.</p>
    <p style="color:#737373;font-size:13px;line-height:1.55;margin:0 0 20px;">XP applies to your account level and unlocks recognition across the platform.</p>
    ${ctaButton(`${APP_URL}/student`, "Open Mentrixa")}`;
}

export function passwordResetEmailBody(hi: string, resetLink: string): string {
  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">We received a request to reset your Mentrixa password. Use the button below — the link expires for your security.</p>
    <p style="color:#737373;font-size:12px;line-height:1.5;margin:0 0 20px;">If you didn't ask for this, you can ignore this email.</p>
    ${ctaButton(resetLink, "Reset password")}`;
}

export function tutorApprovedEmailBody(hi: string): string {
  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Your tutor application was <strong style="color:#eee;">approved</strong>. You can publish availability, accept learners, and configure payout details.</p>
    <p style="color:#737373;font-size:13px;line-height:1.55;margin:0 0 20px;">Finish tutor setup in your dashboard if you haven't already — availability and payout details are both required before learners can book.</p>
    ${ctaButton(`${APP_URL}/tutor`, "Go to tutor home")}`;
}

export type TutorPayoutEmailBodyProps = {
  hi: string;
  amountFormatted: string;
  arrivalEstimate?: string | null;
};

export function tutorPayoutEmailBody(props: TutorPayoutEmailBodyProps): string {
  const arrival = props.arrivalEstimate?.trim();
  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(props.hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Your payout of <strong style="color:#eee;">${escapeHtml(props.amountFormatted)}</strong> is being sent to your selected payout method.</p>
    ${arrival ? `<table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;border-collapse:collapse;">${detailRow("Estimated arrival", escapeHtml(arrival))}</table>` : ""}
    <p style="color:#737373;font-size:13px;line-height:1.55;margin:0 0 20px;">Details appear in Mentrixa earnings.</p>
    ${ctaButton(`${APP_URL}/tutor`, "View earnings")}`;
}

export type VerificationStartedEmailBodyProps = {
  hi: string;
  email: string;
  roleLabel: string;
  deadlineHours: number;
  role: "tutor" | "student";
};

export function verificationStartedEmailBody(props: VerificationStartedEmailBodyProps): string {
  return `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Hi <strong style="color:#eee;">${escapeHtml(props.hi)}</strong>,
    </p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Welcome to Mentrixa. Your account is being verified by our team , this typically completes within
      <strong style="color:#eee;">${props.deadlineHours} hours</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0 20px;border-collapse:collapse;">
      <tr>
        <td style="padding:16px;background:#161616;border:1px solid #2a2a2a;border-radius:10px;border-left:3px solid #22c55e;">
          <p style="margin:0 0 10px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">While we verify your account</p>
          <ul style="margin:0;padding-left:18px;">
            <li style="margin:0 0 6px;color:#d1d5db;font-size:14px;line-height:1.55;">You have <strong style="color:#eee;">full access</strong> to Mentrixa , no restrictions during review</li>
            <li style="margin:0 0 6px;color:#d1d5db;font-size:14px;line-height:1.55;">We'll email you the moment your verification is complete</li>
            <li style="margin:0 0 0;color:#d1d5db;font-size:14px;line-height:1.55;">If we need anything from you, we'll reach out here at ${escapeHtml(props.email)}</li>
          </ul>
        </td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 20px;">
      You're registered as a <strong style="color:#ccc;">${props.roleLabel}</strong>. Verification ensures every Mentrixer on the platform is who they say they are.
    </p>
    ${ctaButton(`${APP_URL}/${props.role}`, `Go to your ${props.roleLabel} home`)}
  `;
}

export function verificationApprovedEmailBody(hi: string, roleLabel: string, role: "tutor" | "student"): string {
  return `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
    </p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Your Mentrixa account has been <strong style="color:#22c55e;">verified</strong>. You're fully cleared — welcome to the community.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;border-collapse:collapse;">
      <tr>
        <td style="padding:16px;background:#161616;border:1px solid #2a2a2a;border-radius:10px;border-left:3px solid #22c55e;">
          <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Account status</p>
          <p style="margin:0;color:#22c55e;font-size:15px;font-weight:600;">✓ Verified ${roleLabel}</p>
        </td>
      </tr>
    </table>
    ${ctaButton(`${APP_URL}/${role}`, `Open Mentrixa`)}
  `;
}

export function verificationRejectedEmailBody(hi: string, reason?: string | null): string {
  const reasonBlock = reason
    ? `<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:14px 16px;background:#1a0a0a;border:1px solid #3a1a1a;border-radius:10px;border-left:3px solid #ef4444;">
            <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Reason</p>
            <p style="margin:0;color:#fca5a5;font-size:14px;line-height:1.6;">${escapeHtml(reason)}</p>
          </td>
        </tr>
      </table>`
    : "";

  return `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
    </p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      After reviewing your account, we were unable to verify your identity at this time.
      Your access has been restricted.
    </p>
    ${reasonBlock}
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 20px;">
      If you believe this is an error or have updated information to provide, please reply to this email.
    </p>
    ${ctaButton(`${APP_URL}/auth/signin?signin=1`, "Sign in to Mentrixa")}
  `;
}

export function verificationBlacklistedEmailBody(hi: string, reason: string): string {
  return `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
    </p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Our team has determined that your account contains false or fraudulent information.
      Your account has been permanently suspended from Mentrixa.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:14px 16px;background:#1a0a0a;border:1px solid #3a1a1a;border-radius:10px;border-left:3px solid #dc2626;">
          <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Reason for suspension</p>
          <p style="margin:0;color:#fca5a5;font-size:14px;line-height:1.6;">${escapeHtml(reason)}</p>
        </td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
      This decision is final. If you believe this is in error, you may contact us at <a href="mailto:support@mentrixa.one" style="color:#60a5fa;">support@mentrixa.one</a>.
    </p>
  `;
}

export type VerificationInfoRequestEmailBodyProps = {
  hi: string;
  roleLabel: string;
  message: string;
  replyTo: string;
};

export function verificationInfoRequestEmailBody(props: VerificationInfoRequestEmailBodyProps): string {
  return `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Hi <strong style="color:#eee;">${escapeHtml(props.hi)}</strong>,
    </p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Our verification team is reviewing your ${props.roleLabel} account and needs a little more information from you.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:16px;background:#161616;border:1px solid #2a2a2a;border-radius:10px;border-left:3px solid #f59e0b;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">What we need from you</p>
          <p style="margin:0;color:#e5e7eb;font-size:14px;line-height:1.65;">${escapeHtml(props.message)}</p>
        </td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 20px;">
      Please reply to this email with the requested information. Your access remains fully active while we await your response.
    </p>
    ${ctaButton(`mailto:${props.replyTo}`, "Reply to this email")}
  `;
}

export type ContactFeedbackEmailBodyProps = {
  fromName: string;
  fromEmail: string;
  category: string;
  message: string;
};

export function contactFeedbackEmailBody(props: ContactFeedbackEmailBodyProps): string {
  return `
      <p style="color:#b4b4b4;font-size:14px;line-height:1.6;margin:0 0 10px;">
        <strong style="color:#e5e5e5;">From:</strong> ${escapeHtml(props.fromName)}
        &lt;${escapeHtml(props.fromEmail)}&gt;
      </p>
      <p style="color:#b4b4b4;font-size:14px;line-height:1.6;margin:0 0 18px;">
        <strong style="color:#e5e5e5;">Topic:</strong> ${escapeHtml(props.category)}
      </p>
      <div style="color:#e5e5e5;font-size:15px;line-height:1.65;white-space:pre-wrap;border-left:3px solid #3b82f6;padding-left:16px;margin:0 0 20px;">
        ${escapeHtml(props.message)}
      </div>
      <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0 0 12px;">
        Open Mentrixa: <a href="${APP_URL}" style="color:#60a5fa;text-decoration:underline;">${escapeHtml(APP_URL)}</a>
      </p>
      <p style="color:#737373;font-size:12px;line-height:1.5;margin:0;">
        Reply directly to the sender using Reply in your inbox 
      </p>
    `;
}

export { greetingFirstName, formatPriceUsd, DEFAULT_PUBLIC_FEEDBACK_EMAIL };

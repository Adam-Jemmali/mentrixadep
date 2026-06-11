/**
 * Marketing, onboarding, engagement, and verification emails.
 * Waitlist, welcome, referral, level-up, duel, password reset, tutor approval/payout,
 * verification lifecycle, and contact feedback.
 */

import {
  escapeHtml,
  greetingFirstName,
  formatPriceUsd,
  APP_URL,
  EMAIL_ASSET_ORIGIN,
  FROM_ADDRESS,
  sendEmail,
  sendWaitlistEmailWithFallback,
  headerLogoInlineAttachments,
  DEFAULT_PUBLIC_FEEDBACK_EMAIL,
} from "./shared";
import { baseTemplate, detailRow, ctaButton } from "./templates";
import type { ProgressSnapshotData } from "@/features/progress-snapshot/types";
import { normalizeRankTitle } from "@/features/xp/rank-icons";

// ─── Welcome emails ──────────────────────────────────────────────────────────

export interface WelcomeStudentEmailProps {
  displayName?: string | null;
  /** Bonus XP for first completed session — explain in copy */
  firstSessionBonusXp?: number;
}

/** welcome_student */
export async function sendWelcomeStudentEmail(
  studentEmail: string,
  props: WelcomeStudentEmailProps = {}
): Promise<void> {
  const hi = greetingFirstName(props.displayName, studentEmail);
  const bonus = props.firstSessionBonusXp ?? 50;

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
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
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 20px;">Complete your <strong style="color:#e5e5e5;">first session</strong> and earn <strong style="color:#e5e5e5;">+${bonus} XP</strong> toward your account level — small nudge, real momentum.</p>
    ${ctaButton(`${APP_URL}/student`, "Book your first session")}`;

  await sendEmail(
    studentEmail,
    `${hi}, welcome to Mentrixa`,
    baseTemplate("Welcome, Learner", body)
  );
}

export interface WelcomeTutorEmailProps {
  displayName?: string | null;
  /** Optional tutor payout setup URL */
  stripeConnectUrl?: string;
}

/** welcome_tutor */
export async function sendWelcomeTutorEmail(
  tutorEmail: string,
  props: WelcomeTutorEmailProps = {}
): Promise<void> {
  const hi = greetingFirstName(props.displayName, tutorEmail);
  const payoutSetupUrl = props.stripeConnectUrl ?? `${APP_URL}/tutor`;

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
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
    ${ctaButton(payoutSetupUrl, "Set up payouts")}`;

  await sendEmail(
    tutorEmail,
    `${hi}, welcome to Mentrixa — Guides`,
    baseTemplate("Welcome, Guide", body)
  );
}

// ─── Waitlist ────────────────────────────────────────────────────────────────

export async function sendWaitlistReceivedEmail(
  email: string,
  role: "student" | "tutor",
): Promise<boolean> {
  const hi = greetingFirstName(undefined, email);
  const roleLabel = role === "tutor" ? "Guide" : "Mentrixer";
  const body = `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">
      Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
    </p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">
      You're in Mentrixa onboarding as a <strong style="color:#eee;">${escapeHtml(roleLabel)}</strong>.
      We will email you as soon as an admin approves your access.
    </p>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 20px;">
      Until approval, sign in and sign up stay locked for this email.
    </p>
    ${ctaButton(`${APP_URL}/`, "Back to Mentrixa")}
  `;
  return sendWaitlistEmailWithFallback(
    email,
    `${hi}, your Mentrixa onboarding request is received`,
    baseTemplate("Onboarding request received", body),
  );
}

export async function sendWaitlistDecisionEmail(
  email: string,
  role: "student" | "tutor",
  status: "approved" | "rejected",
): Promise<boolean> {
  const hi = greetingFirstName(undefined, email);
  const roleLabel = role === "tutor" ? "Guide" : "Mentrixer";
  const approved = status === "approved";
  const body = approved
    ? `
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
    `
    : `
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

  return sendWaitlistEmailWithFallback(
    email,
    approved
      ? `${hi}, your Mentrixa access is approved`
      : `${hi}, update on your Mentrixa access request`,
    baseTemplate(approved ? "Access approved" : "Access update", body),
  );
}

// ─── Level up ────────────────────────────────────────────────────────────────

export interface LevelUpEmailProps {
  displayName?: string | null;
  /** e.g. Expert */
  newLevelTitle: string;
  totalXp: number;
  /** Public URL to badge art (defaults to app icon) */
  badgeImageUrl?: string;
}

/** level_up */
export async function sendLevelUpEmail(email: string, props: LevelUpEmailProps): Promise<void> {
  const hi = greetingFirstName(props.displayName, email);
  const badgeSrc = props.badgeImageUrl ?? `${EMAIL_ASSET_ORIGIN}/mentrixa-checkout-icon.svg`;

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 16px;">You reached <strong style="color:#eee;">${escapeHtml(props.newLevelTitle)}</strong> — ${props.totalXp.toLocaleString("en-US")} total XP. Keep the streak going.</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;border-collapse:collapse;">
      <tr>
        <td style="text-align:center;padding:16px 24px;background:#161616;border:1px solid #262626;border-radius:8px;">
          <img src="${badgeSrc}" alt="" width="72" height="72" style="display:block;margin:0 auto 12px;" />
          <p style="margin:0;color:#e5e5e5;font-size:16px;font-weight:600;">${escapeHtml(props.newLevelTitle)}</p>
        </td>
      </tr>
    </table>
    ${ctaButton(`${APP_URL}/student`, "See your progress")}`;

  await sendEmail(
    email,
    `${hi}, you reached ${props.newLevelTitle} · Mentrixa`,
    baseTemplate("Level up", body)
  );
}

// ─── Duel challenge ──────────────────────────────────────────────────────────

export interface DuelChallengeEmailProps {
  displayName?: string | null;
  challengerDisplayName: string;
  duelId: string;
  divisionLabel?: string | null;
}

/** duel_challenge */
export async function sendDuelChallengeEmail(
  email: string,
  data: DuelChallengeEmailProps
): Promise<void> {
  const hi = greetingFirstName(data.displayName, email);
  const div = data.divisionLabel?.trim();

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;"><strong style="color:#eee;">${escapeHtml(data.challengerDisplayName)}</strong> challenged you to a skill duel${div ? ` in <strong style="color:#eee;">${escapeHtml(div)}</strong>` : ""}. Accept from Mentrixa to lock the match.</p>
    ${ctaButton(`${APP_URL}/student/duel/${data.duelId}`, "View duel")}`;

  await sendEmail(
    email,
    `${data.challengerDisplayName} challenged you — Mentrixa`,
    baseTemplate("Duel challenge", body)
  );
}

// ─── Referral success ────────────────────────────────────────────────────────

export interface ReferralSuccessEmailProps {
  displayName?: string | null;
  xpAwarded: number;
  friendDisplayName?: string | null;
}

/** referral_success */
export async function sendReferralSuccessEmail(
  email: string,
  props: ReferralSuccessEmailProps
): Promise<void> {
  const hi = greetingFirstName(props.displayName, email);
  const friend = props.friendDisplayName?.trim();

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">${friend ? `<strong style="color:#eee;">${escapeHtml(friend)}</strong> joined Mentrixa through your referral.` : "A friend joined Mentrixa through your referral."} You earned <strong style="color:#eee;">+${props.xpAwarded.toLocaleString("en-US")} XP</strong>.</p>
    <p style="color:#737373;font-size:13px;line-height:1.55;margin:0 0 20px;">XP applies to your account level and unlocks recognition across the platform.</p>
    ${ctaButton(`${APP_URL}/student`, "Open Mentrixa")}`;

  await sendEmail(
    email,
    `${hi}, you earned ${props.xpAwarded} referral XP · Mentrixa`,
    baseTemplate("Referral reward", body)
  );
}

// ─── Password reset ──────────────────────────────────────────────────────────

export interface PasswordResetEmailProps {
  resetLink: string;
}

/** password_reset */
export async function sendPasswordResetEmail(email: string, props: PasswordResetEmailProps): Promise<void> {
  const hi = greetingFirstName(undefined, email);

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">We received a request to reset your Mentrixa password. Use the button below — the link expires for your security.</p>
    <p style="color:#737373;font-size:12px;line-height:1.5;margin:0 0 20px;">If you didn't ask for this, you can ignore this email.</p>
    ${ctaButton(props.resetLink, "Reset password")}`;

  await sendEmail(
    email,
    "Reset your Mentrixa password",
    baseTemplate("Password reset", body)
  );
}

// ─── Tutor approved ──────────────────────────────────────────────────────────

export interface TutorApprovedEmailProps {
  displayName?: string | null;
}

/** tutor_approved — registration / course approval */
export async function sendTutorApprovedEmail(
  tutorEmail: string,
  props: TutorApprovedEmailProps = {}
): Promise<void> {
  const hi = greetingFirstName(props.displayName, tutorEmail);

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Your tutor application was <strong style="color:#eee;">approved</strong>. You can publish availability, accept learners, and configure payout details.</p>
    <p style="color:#737373;font-size:13px;line-height:1.55;margin:0 0 20px;">Finish tutor setup in your dashboard if you haven't already — availability and payout details are both required before learners can book.</p>
    ${ctaButton(`${APP_URL}/tutor`, "Go to tutor home")}`;

  await sendEmail(
    tutorEmail,
    `${hi}, your Guide application is approved · Mentrixa`,
    baseTemplate("You're approved", body)
  );
}

// ─── Tutor payout ────────────────────────────────────────────────────────────

export interface TutorPayoutEmailProps {
  displayName?: string | null;
  amountCents: number;
  /** e.g. "Arrives Apr 5–7" */
  arrivalEstimate?: string | null;
}

/** tutor_payout */
export async function sendTutorPayoutEmail(tutorEmail: string, props: TutorPayoutEmailProps): Promise<void> {
  const hi = greetingFirstName(props.displayName, tutorEmail);
  const amt = formatPriceUsd(props.amountCents) ?? "$0.00";
  const arrival = props.arrivalEstimate?.trim();

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Your payout of <strong style="color:#eee;">${escapeHtml(amt)}</strong> is being sent to your selected payout method.</p>
    ${arrival ? `<table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;border-collapse:collapse;">${detailRow("Estimated arrival", escapeHtml(arrival))}</table>` : ""}
    <p style="color:#737373;font-size:13px;line-height:1.55;margin:0 0 20px;">Details appear in Mentrixa earnings.</p>
    ${ctaButton(`${APP_URL}/tutor`, "View earnings")}`;

  await sendEmail(
    tutorEmail,
    `Payout of ${amt} is on the way · Mentrixa`,
    baseTemplate("Payout sent", body)
  );
}

// ─── Verification emails ─────────────────────────────────────────────────────

export interface VerificationStartedEmailData {
  displayName?: string | null;
  email: string;
  role: "tutor" | "student";
  deadlineHours: number;
}

export async function sendVerificationStartedEmail(
  data: VerificationStartedEmailData
): Promise<void> {
  const hi = greetingFirstName(data.displayName, data.email);
  const roleLabel = data.role === "tutor" ? "Guide" : "Learner";
  const hours = data.deadlineHours;

  const body = `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
    </p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Welcome to Mentrixa. Your account is being verified by our team , this typically completes within
      <strong style="color:#eee;">${hours} hours</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0 20px;border-collapse:collapse;">
      <tr>
        <td style="padding:16px;background:#161616;border:1px solid #2a2a2a;border-radius:10px;border-left:3px solid #22c55e;">
          <p style="margin:0 0 10px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">While we verify your account</p>
          <ul style="margin:0;padding-left:18px;">
            <li style="margin:0 0 6px;color:#d1d5db;font-size:14px;line-height:1.55;">You have <strong style="color:#eee;">full access</strong> to Mentrixa , no restrictions during review</li>
            <li style="margin:0 0 6px;color:#d1d5db;font-size:14px;line-height:1.55;">We'll email you the moment your verification is complete</li>
            <li style="margin:0 0 0;color:#d1d5db;font-size:14px;line-height:1.55;">If we need anything from you, we'll reach out here at ${escapeHtml(data.email)}</li>
          </ul>
        </td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 20px;">
      You're registered as a <strong style="color:#ccc;">${roleLabel}</strong>. Verification ensures every Mentrixer on the platform is who they say they are.
    </p>
    ${ctaButton(`${APP_URL}/${data.role}`, `Go to your ${roleLabel} home`)}
  `;

  await sendEmail(
    data.email,
    `${hi}, your Mentrixa account is under verification`,
    baseTemplate("Verification in progress", body)
  );
}

export interface VerificationApprovedEmailData {
  displayName?: string | null;
  email: string;
  role: "tutor" | "student";
}

export async function sendVerificationApprovedEmail(
  data: VerificationApprovedEmailData
): Promise<void> {
  const hi = greetingFirstName(data.displayName, data.email);
  const roleLabel = data.role === "tutor" ? "Guide" : "Learner";

  const body = `
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
    ${ctaButton(`${APP_URL}/${data.role}`, `Open Mentrixa`)}
  `;

  await sendEmail(
    data.email,
    `${hi}, your Mentrixa account is verified ✓`,
    baseTemplate("You're verified ! Welcome to Mentrixa", body)
  );
}

export interface VerificationRejectedEmailData {
  displayName?: string | null;
  email: string;
  role: "tutor" | "student";
  reason?: string | null;
}

export async function sendVerificationRejectedEmail(
  data: VerificationRejectedEmailData
): Promise<void> {
  const hi = greetingFirstName(data.displayName, data.email);

  const reasonBlock = data.reason
    ? `<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:14px 16px;background:#1a0a0a;border:1px solid #3a1a1a;border-radius:10px;border-left:3px solid #ef4444;">
            <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Reason</p>
            <p style="margin:0;color:#fca5a5;font-size:14px;line-height:1.6;">${escapeHtml(data.reason)}</p>
          </td>
        </tr>
      </table>`
    : "";

  const body = `
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

  await sendEmail(
    data.email,
    `Your Mentrixa account verification could not be completed`,
    baseTemplate("Verification unsuccessful", body)
  );
}

export interface VerificationBlacklistedEmailData {
  displayName?: string | null;
  email: string;
  reason: string;
}

export async function sendVerificationBlacklistedEmail(
  data: VerificationBlacklistedEmailData
): Promise<void> {
  const hi = greetingFirstName(data.displayName, data.email);

  const body = `
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
          <p style="margin:0;color:#fca5a5;font-size:14px;line-height:1.6;">${escapeHtml(data.reason)}</p>
        </td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
      This decision is final. If you believe this is in error, you may contact us at <a href="mailto:support@mentrixa.one" style="color:#60a5fa;">support@mentrixa.one</a>.
    </p>
  `;

  await sendEmail(
    data.email,
    `Important: Your Mentrixa account has been suspended`,
    baseTemplate("Account suspended", body)
  );
}

export interface VerificationInfoRequestEmailData {
  displayName?: string | null;
  email: string;
  role: "tutor" | "student";
  message: string;
  replyEmail?: string;
}

export async function sendVerificationInfoRequestEmail(
  data: VerificationInfoRequestEmailData
): Promise<void> {
  const hi = greetingFirstName(data.displayName, data.email);
  const roleLabel = data.role === "tutor" ? "Guide" : "Learner";
  const replyTo = data.replyEmail ?? "support@mentrixa.one";

  const body = `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
    </p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Our verification team is reviewing your ${roleLabel} account and needs a little more information from you.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:16px;background:#161616;border:1px solid #2a2a2a;border-radius:10px;border-left:3px solid #f59e0b;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">What we need from you</p>
          <p style="margin:0;color:#e5e7eb;font-size:14px;line-height:1.65;">${escapeHtml(data.message)}</p>
        </td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 20px;">
      Please reply to this email with the requested information. Your access remains fully active while we await your response.
    </p>
    ${ctaButton(`mailto:${replyTo}`, "Reply to this email")}
  `;

  await sendEmail(
    data.email,
    `${hi}, we need a bit more info to verify your Mentrixa account`,
    baseTemplate("Information needed for verification", body)
  );
}

// ─── Contact feedback ────────────────────────────────────────────────────────

/** Public contact form → team inbox via Resend (`reply_to` = sender so you can reply in one click). */
export async function sendContactFeedbackInbound(params: {
  fromEmail: string;
  fromName: string;
  category: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const inbox =
    process.env.CONTACT_INBOX_EMAIL?.trim() || DEFAULT_PUBLIC_FEEDBACK_EMAIL;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set");
    return { ok: false, error: "Email is not configured on this server." };
  }

  const subject = `Mentrixa Feedback ${params.category} from ${params.fromName}`;
  const body = `
      <p style="color:#b4b4b4;font-size:14px;line-height:1.6;margin:0 0 10px;">
        <strong style="color:#e5e5e5;">From:</strong> ${escapeHtml(params.fromName)}
        &lt;${escapeHtml(params.fromEmail)}&gt;
      </p>
      <p style="color:#b4b4b4;font-size:14px;line-height:1.6;margin:0 0 18px;">
        <strong style="color:#e5e5e5;">Topic:</strong> ${escapeHtml(params.category)}
      </p>
      <div style="color:#e5e5e5;font-size:15px;line-height:1.65;white-space:pre-wrap;border-left:3px solid #3b82f6;padding-left:16px;margin:0 0 20px;">
        ${escapeHtml(params.message)}
      </div>
      <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0 0 12px;">
        Open Mentrixa: <a href="${APP_URL}" style="color:#60a5fa;text-decoration:underline;">${escapeHtml(APP_URL)}</a>
      </p>
      <p style="color:#737373;font-size:12px;line-height:1.5;margin:0;">
        Reply directly to the sender using Reply in your inbox 
      </p>
    `;

  try {
    const attachments = headerLogoInlineAttachments();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [inbox],
        reply_to: params.fromEmail,
        subject,
        html: baseTemplate("Feedback from mentrixa.one", body),
        ...(attachments.length > 0 ? { attachments } : {}),
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[email] contact feedback failed:", t);
      return { ok: false, error: "Could not send your message. Please try again in a moment." };
    }
  } catch (e) {
    console.error("[email] contact feedback error:", e);
    return { ok: false, error: "Could not send your message. Please try again in a moment." };
  }
  return { ok: true };
}

// ─── Progress Snapshot (weekly) ─────────────────────────────────────────────

export interface ProgressSnapshotEmailProps {
  snapshot: ProgressSnapshotData;
}

function rankBadgeImg(title: string): string {
  const key = normalizeRankTitle(title).toLowerCase();
  const file =
    key === "mentrixer"
      ? "mentrixer-rank.svg"
      : `${key}.svg`;
  return `${EMAIL_ASSET_ORIGIN}/icons/${file}`;
}

function signedDelta(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "0";
}

/** progress_snapshot — Monday weekly conversion email */
export async function sendProgressSnapshotEmail(
  email: string,
  props: ProgressSnapshotEmailProps,
): Promise<void> {
  const s = props.snapshot;
  const hi = s.firstName;
  const prev = normalizeRankTitle(s.rankChange.previous.title);
  const cur = normalizeRankTitle(s.rankChange.current.title);
  const rankArrow =
    s.rankChange.direction === "up" ? "↑" : s.rankChange.direction === "down" ? "↓" : "→";
  const divDelta = s.divisionRank.delta;
  const divPhrase =
    divDelta > 0
      ? `up from #${s.divisionRank.previous}`
      : divDelta < 0
        ? `down from #${s.divisionRank.previous}`
        : `held at #${s.divisionRank.current}`;

  const predictionLine =
    s.predictedNextRank.daysAtCurrentPace != null
      ? `One Guide session on this puts you at ${normalizeRankTitle(s.predictedNextRank.title)} within ${s.predictedNextRank.daysAtCurrentPace} days.`
      : `One Guide session on ${s.weakestConcept.label} is the fastest path to ${normalizeRankTitle(s.predictedNextRank.title)}.`;

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 16px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px;">Your week in ${escapeHtml(s.subject)}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#888;font-size:13px;width:140px;">Rank</td>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#f5f5f5;font-size:14px;">
          <img src="${rankBadgeImg(s.rankChange.previous.title)}" alt="" width="28" height="28" style="vertical-align:middle;margin-right:6px;" />
          ${escapeHtml(prev)} ${rankArrow}
          <img src="${rankBadgeImg(s.rankChange.current.title)}" alt="" width="28" height="28" style="vertical-align:middle;margin:0 6px;" />
          <strong>${escapeHtml(cur)}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#888;font-size:13px;">Quest accuracy</td>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#f5f5f5;font-size:14px;">${s.accuracyThisWeek}% (${signedDelta(s.accuracyDelta)}% vs last week)</td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#888;font-size:13px;">Duels</td>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#f5f5f5;font-size:14px;">${s.duelsWon} won, ${s.duelsLost} lost</td>
      </tr>
      <tr>
        <td style="padding:12px 0;color:#888;font-size:13px;">Division rank</td>
        <td style="padding:12px 0;color:#f5f5f5;font-size:14px;">#${s.divisionRank.current} (${divPhrase})</td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid #262626;margin:20px 0;" />
    <p style="margin:0 0 8px;color:#fca5a5;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Weak spot</p>
    <p style="margin:0 0 12px;color:#e5e5e5;font-size:15px;line-height:1.6;">Your weakest concept: <strong>${escapeHtml(s.weakestConcept.label)}</strong> — ${s.weakestConcept.accuracyPercent}% accuracy</p>
    <p style="margin:0 0 12px;color:#86efac;font-size:14px;line-height:1.6;"><strong>${escapeHtml(s.recommendedGuide.displayName)}</strong> has a ${Math.round(s.recommendedGuide.impactScore)} Impact Score in ${escapeHtml(s.recommendedGuide.impactSubject)}.</p>
    <p style="margin:0 0 20px;color:#a3a3a3;font-size:14px;line-height:1.6;">${escapeHtml(predictionLine)}</p>
    ${ctaButton(s.bookingCtaUrl, `Book ${s.recommendedGuide.displayName} — $39`)}
    <p style="margin:20px 0 0;color:#525252;font-size:12px;line-height:1.55;text-align:center;">Free to compete. You only pay when you book.</p>`;

  const subjectRank =
    s.rankChange.direction === "up"
      ? "your rank moved up this week"
      : s.rankChange.direction === "down"
        ? "your rank moved down this week"
        : "your weekly progress snapshot";

  await sendEmail(
    email,
    `${hi} — ${subjectRank}`,
    baseTemplate(`Your week in ${s.subject}`, body),
  );
}

/** breakthrough_guide — notify Guide when student breaks through after a session */
export async function sendBreakthroughGuideEmail(
  tutorEmail: string,
  props: {
    studentName: string;
    concept: string;
    accuracyBefore: number;
    accuracyAfter: number;
    course?: string;
  },
): Promise<void> {
  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;"><strong style="color:#eee;">${escapeHtml(props.studentName)}</strong> just broke through <strong style="color:#D4A017;">${escapeHtml(props.concept)}</strong>${props.course ? ` in ${escapeHtml(props.course)}` : ""}.</p>
    <p style="color:#e5e5e5;font-size:18px;font-weight:700;margin:0 0 16px;">${props.accuracyBefore}% → ${props.accuracyAfter}%</p>
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 20px;">Your Impact Score reflects real accuracy movement — this breakthrough is now part of their verified record.</p>
    ${ctaButton(`${APP_URL}/tutor`, "View command center")}`;

  await sendEmail(
    tutorEmail,
    `${props.studentName} broke through ${props.concept}`,
    baseTemplate("Student breakthrough", body),
  );
}

/**
 * Marketing, onboarding, engagement, and verification emails.
 * Waitlist, welcome, referral, level-up, duel, password reset, tutor approval/payout,
 * verification lifecycle, and contact feedback.
 */

import {
  APP_URL,
  FROM_ADDRESS,
  sendEmail,
  sendWaitlistEmailWithFallback,
  headerLogoInlineAttachments,
} from "./shared";
import { baseTemplate } from "./templates";
import type { ProgressSnapshotData } from "@/features/progress-snapshot/types";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import {
  contactFeedbackEmailBody,
  DEFAULT_PUBLIC_FEEDBACK_EMAIL,
  duelChallengeEmailBody,
  formatPriceUsd,
  greetingFirstName,
  levelUpBadgeImageUrl,
  levelUpEmailBody,
  passwordResetEmailBody,
  referralSuccessEmailBody,
  tutorApprovedEmailBody,
  tutorPayoutEmailBody,
  verificationApprovedEmailBody,
  verificationBlacklistedEmailBody,
  verificationInfoRequestEmailBody,
  verificationRejectedEmailBody,
  verificationStartedEmailBody,
  waitlistApprovedEmailBody,
  waitlistReceivedEmailBody,
  waitlistRejectedEmailBody,
  welcomeStudentEmailBody,
  welcomeTutorEmailBody,
} from "./templates/marketing-email-bodies";
import {
  progressSnapshotEmailBody,
  progressSnapshotEmailSubject,
  progressSnapshotEmailTitle,
} from "./templates/progress-snapshot-email";
import {
  movementReceiptEmailBody,
  movementReceiptEmailSubjectLine,
  movementReceiptEmailTitle,
} from "./templates/movement-receipt-email";
import {
  breakthroughGuideEmailBody,
  breakthroughGuideEmailSubject,
  breakthroughGuideEmailTitle,
} from "./templates/breakthrough-guide-email";
import {
  loopSlaGrantEmailBody,
  loopSlaGrantEmailSubject,
  loopSlaGrantEmailTitle,
} from "./templates/loop-sla-grant-email";
import {
  movementReceiptMonthlyRollupEmailBody,
  movementReceiptMonthlyRollupEmailSubject,
  movementReceiptMonthlyRollupEmailTitle,
} from "./templates/movement-receipt-monthly-rollup-email";

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
  const body = welcomeStudentEmailBody({ hi, firstSessionBonusXp: bonus });

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
  const body = welcomeTutorEmailBody({ hi, payoutSetupUrl });

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
  const body = waitlistReceivedEmailBody(hi, roleLabel);
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
    ? waitlistApprovedEmailBody(hi, roleLabel, email, role)
    : waitlistRejectedEmailBody(hi, roleLabel);

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
  const body = levelUpEmailBody({
    hi,
    newLevelTitle: props.newLevelTitle,
    totalXp: props.totalXp,
    badgeImageUrl: levelUpBadgeImageUrl(props.badgeImageUrl),
  });

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
  const body = duelChallengeEmailBody({
    hi,
    challengerDisplayName: data.challengerDisplayName,
    duelId: data.duelId,
    divisionLabel: data.divisionLabel,
  });

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
  const body = referralSuccessEmailBody({
    hi,
    xpAwarded: props.xpAwarded,
    friendDisplayName: props.friendDisplayName,
  });

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
  const body = passwordResetEmailBody(hi, props.resetLink);

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
  const body = tutorApprovedEmailBody(hi);

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
  const body = tutorPayoutEmailBody({
    hi,
    amountFormatted: amt,
    arrivalEstimate: props.arrivalEstimate,
  });

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
  const body = verificationStartedEmailBody({
    hi,
    email: data.email,
    roleLabel,
    deadlineHours: data.deadlineHours,
    role: data.role,
  });

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
  const body = verificationApprovedEmailBody(hi, roleLabel, data.role);

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
  const body = verificationRejectedEmailBody(hi, data.reason);

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
  const body = verificationBlacklistedEmailBody(hi, data.reason);

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
  const body = verificationInfoRequestEmailBody({
    hi,
    roleLabel,
    message: data.message,
    replyTo,
  });

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
  const body = contactFeedbackEmailBody(params);

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
  weeklyVerdict?: Verdict | null;
}

/** progress_snapshot — Monday weekly conversion email */
export async function sendProgressSnapshotEmail(
  email: string,
  props: ProgressSnapshotEmailProps,
): Promise<void> {
  await sendEmail(
    email,
    progressSnapshotEmailSubject(props),
    baseTemplate(progressSnapshotEmailTitle(props), progressSnapshotEmailBody(props)),
  );
}

export interface MovementReceiptEmailProps {
  receipt: import("@/features/movement-receipt/types").MovementReceiptData;
}

/** movement_receipt — Monday weekly verified movement email (Momentum) */
export async function sendMovementReceiptEmail(
  email: string,
  props: MovementReceiptEmailProps,
): Promise<void> {
  await sendEmail(
    email,
    movementReceiptEmailSubjectLine(props),
    baseTemplate(movementReceiptEmailTitle(props), movementReceiptEmailBody(props)),
  );
}

export type MovementReceiptMonthlyRollupEmailProps = {
  firstName: string;
  rollup: import("@/features/movement-receipt/movement-receipt-monthly-rollup-pure").MonthlyMovementRollup;
};

/** movement_receipt_monthly_rollup — first-of-month digest (Momentum) */
export async function sendMovementReceiptMonthlyRollupEmail(
  email: string,
  props: MovementReceiptMonthlyRollupEmailProps,
): Promise<void> {
  await sendEmail(
    email,
    movementReceiptMonthlyRollupEmailSubject(props),
    baseTemplate(
      movementReceiptMonthlyRollupEmailTitle(props),
      movementReceiptMonthlyRollupEmailBody(props),
    ),
  );
}

export type CreditEscalationEmailProps =
  import("@/features/entitlements/credit-escalation-pure").CreditEscalationEmailData;

/** credit_escalation — day 1 / day 20 / last day session credit nudges */
export async function sendCreditEscalationEmail(
  email: string,
  props: CreditEscalationEmailProps,
): Promise<void> {
  await sendEmail(
    email,
    creditEscalationEmailSubject(props),
    baseTemplate(creditEscalationEmailTitle(props), creditEscalationEmailBody(props)),
  );
}

export type LoopSlaGrantEmailProps = {
  firstName: string;
  nodeName: string;
  subject: string;
  verdict: string;
  nextAction: string;
};

/** loop_sla_grant — Momentum Loop SLA credit restoration */
export async function sendLoopSlaGrantEmail(
  email: string,
  props: LoopSlaGrantEmailProps,
): Promise<void> {
  await sendEmail(
    email,
    loopSlaGrantEmailSubject(props),
    baseTemplate(loopSlaGrantEmailTitle(props), loopSlaGrantEmailBody(props)),
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
  await sendEmail(
    tutorEmail,
    breakthroughGuideEmailSubject(props),
    baseTemplate(breakthroughGuideEmailTitle(), breakthroughGuideEmailBody(props)),
  );
}

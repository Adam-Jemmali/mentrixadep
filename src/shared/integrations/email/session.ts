/**
 * Session-related transactional emails — booking, confirmation, reminders, cancellation, completion.
 */

import {
  escapeHtml,
  greetingFirstName,
  tutorLabel,
  studentLabel,
  formatDateTime,
  formatTimeOnly,
  formatPriceUsd,
  APP_URL,
  sendEmail,
  type SessionEmailDetails,
} from "./shared";
import {
  baseTemplate,
  detailRow,
  ctaButton,
  sessionFactsTable,
  secondaryLink,
  starRatingLinks,
  googleCalendarTemplateUrl,
} from "./templates";

// ─── Session booked ──────────────────────────────────────────────────────────

export async function sendSessionBookedEmail(
  studentEmail: string,
  tutorEmail: string,
  session: SessionEmailDetails
): Promise<void> {
  const stuHi = greetingFirstName(session.studentDisplayName ?? session.studentName, studentEmail);
  const tutHi = greetingFirstName(session.tutorDisplayName ?? session.tutorName, tutorEmail);
  const tutorNamed = tutorLabel(session);
  const studentNamed = studentLabel(session);

  const studentIntro = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(stuHi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Your request for <strong style="color:#eee;">${escapeHtml(session.course)}</strong> is in. Another Mentrixer (your guide${tutorNamed ? `: ${escapeHtml(tutorNamed)}` : ""}) will review it soon.</p>
    <p style="color:#999;font-size:13px;line-height:1.55;margin:0;">Below are the <em>exact</em> times from the slot you chose.</p>`;

  const tutorIntro = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(tutHi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">A learner on Mentrixa${studentNamed ? ` (${escapeHtml(studentNamed)})` : ""} requested this session. You're their guide — approve or decline from your tutor home.</p>
    <p style="color:#999;font-size:13px;line-height:1.55;margin:0;">Times and duration match the availability block they picked.</p>`;

  const studentBody = `${studentIntro}${sessionFactsTable(session, { includePrice: true, includePartner: "tutor" })}${ctaButton(`${APP_URL}/student#sessions-history`, "Open my sessions")}`;
  const tutorBody = `${tutorIntro}${sessionFactsTable(session, { includePrice: true, includePartner: "student" })}${ctaButton(`${APP_URL}/tutor`, "Review session request")}`;

  await Promise.all([
    sendEmail(
      studentEmail,
      `${stuHi}, your ${session.course} request is in `,
      baseTemplate("Request received, we've got it", studentBody)
    ),
    sendEmail(
      tutorEmail,
      `${tutHi}, new Mentrixa session request , ${session.course}`,
      baseTemplate("A Mentrixer chose you", tutorBody)
    ),
  ]);
}

// ─── Session confirmed (student) ─────────────────────────────────────────────

/** session_confirmed_student — calendar + tips (legacy alias: sendSessionApprovedEmail) */
export async function sendSessionConfirmedStudentEmail(
  studentEmail: string,
  session: SessionEmailDetails
): Promise<void> {
  const hi = greetingFirstName(session.studentDisplayName ?? session.studentName, studentEmail);
  const guide = tutorLabel(session);
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  const calUrl = googleCalendarTemplateUrl({
    title: `Mentrixa · ${session.course}`,
    description: `Live tutoring on Mentrixa with ${guide ?? "your Guide"}. Join: ${APP_URL}/video/session/${session.sessionId}`,
    start,
    end,
    location: `Video — Mentrixa (${APP_URL}/video/session/${session.sessionId})`,
  });

  const tips = `<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse;">
    <tr>
      <td style="padding:14px 16px;background:#161616;border:1px solid #262626;border-radius:8px;">
        <p style="margin:0 0 8px;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Before you join</p>
        <ul style="margin:0;padding-left:18px;color:#a3a3a3;font-size:14px;line-height:1.55;">
          <li style="margin:0 0 6px;">Use a quiet spot and stable connection.</li>
          <li style="margin:0 0 6px;">Bring one concrete goal for the hour.</li>
          <li style="margin:0;">Your Post‑Session Brief lands on your History Dashboard after the session, use it and lock in.</li>
        </ul>
      </td>
    </tr>
  </table>`;

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">You're confirmed. When it's time, you and your Guide join the same Mentrixa room, same course, same clock.</p>
    ${guide ? `<p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 12px;">Guide: <strong style="color:#ddd;">${escapeHtml(guide)}</strong></p>` : ""}
    ${sessionFactsTable(session, { includePrice: true, includePartner: "tutor" })}
    ${tips}
    <p style="margin:0 0 8px;color:#737373;font-size:12px;">Add to Google Calendar</p>
    <p style="margin:0;">${secondaryLink(calUrl, "Open Google Calendar template")}</p>
    ${ctaButton(`${APP_URL}/student?sessionsTab=upcoming#sessions-history`, "View session & join link")}`;

  await sendEmail(
    studentEmail,
    `${hi}, you're on — ${session.course} is confirmed · Mentrixa`,
    baseTemplate("Session confirmed", body)
  );
}

/** @alias session_confirmed_student */
export async function sendSessionApprovedEmail(
  studentEmail: string,
  session: SessionEmailDetails
): Promise<void> {
  return sendSessionConfirmedStudentEmail(studentEmail, session);
}

// ─── Session confirmed (tutor) ───────────────────────────────────────────────

/** session_confirmed_tutor — paid / approved booking alert for the Guide */
export async function sendSessionConfirmedTutorEmail(
  tutorEmail: string,
  session: SessionEmailDetails
): Promise<void> {
  const hi = greetingFirstName(session.tutorDisplayName ?? session.tutorName, tutorEmail);
  const learner = studentLabel(session);

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">New booking confirmed${learner ? ` for <strong style="color:#eee;">${escapeHtml(learner)}</strong>` : ""}. Review details and prep before you meet.</p>
    ${sessionFactsTable(session, { includePrice: true, includePartner: "student" })}
    ${ctaButton(`${APP_URL}/tutor#week-schedule`, "View week schedule")}`;

  await sendEmail(
    tutorEmail,
    `${hi}, new booking — ${session.course} · Mentrixa`,
    baseTemplate("New booking on your calendar", body)
  );
}

// ─── Session reminders ───────────────────────────────────────────────────────

export interface SessionReminderStudentEmailProps extends SessionEmailDetails {
  /** Default 120 for the "two hours before" learner reminder. */
  reminderMinutesBefore?: number;
  /** Defaults to learner dashboard (brief card lives there). */
  preSessionBriefUrl?: string | null;
}

/** session_reminder_student — e.g. 2h before: brief + join */
export async function sendSessionReminderStudentEmail(
  studentEmail: string,
  session: SessionReminderStudentEmailProps
): Promise<void> {
  const lead = session.reminderMinutesBefore ?? 120;
  const hi = greetingFirstName(session.studentDisplayName ?? session.studentName, studentEmail);
  const briefUrl = (session.preSessionBriefUrl ?? `${APP_URL}/student`).trim();

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Your session starts in about <strong style="color:#eee;">${lead} minutes</strong> — time to skim your <strong style="color:#eee;">Pre‑Session Brief</strong> and join focused.</p>
    ${sessionFactsTable(session, { includePartner: "tutor" })}
    ${ctaButton(`${APP_URL}/video/session/${session.sessionId}`, "Join video room")}
    <p style="margin:16px 0 0;color:#737373;font-size:12px;">Pre‑Session Brief</p>
    <p style="margin:0;">${secondaryLink(briefUrl, "Open Pre‑Session Brief")}</p>`;

  await sendEmail(
    studentEmail,
    `${hi}, ${session.course} starts soon — Mentrixa`,
    baseTemplate("Your session starts soon", body)
  );
}

/** session_reminder_tutor — e.g. 30 min before */
export async function sendSessionReminderTutorEmail(
  tutorEmail: string,
  session: SessionEmailDetails
): Promise<void> {
  const lead = session.reminderMinutesBefore ?? 30;
  const hi = greetingFirstName(session.tutorDisplayName ?? session.tutorName, tutorEmail);

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Session starting in about <strong style="color:#eee;">${lead} minutes</strong>. Same video link for you and your learner.</p>
    ${sessionFactsTable(session, { includePartner: "student" })}
    ${ctaButton(`${APP_URL}/video/session/${session.sessionId}`, "Join video room")}`;

  await sendEmail(
    tutorEmail,
    `${hi}, ${session.course} starts in ~${lead} min — Mentrixa`,
    baseTemplate("Session starting soon", body)
  );
}

export async function sendSessionReminderEmail(
  recipientEmail: string,
  session: SessionEmailDetails,
  role: "student" | "tutor"
): Promise<void> {
  if (role === "student") {
    return sendSessionReminderStudentEmail(recipientEmail, {
      ...session,
      reminderMinutesBefore: session.reminderMinutesBefore ?? 30,
      preSessionBriefUrl: `${APP_URL}/student`,
    });
  }
  return sendSessionReminderTutorEmail(recipientEmail, session);
}

// ─── Pre-Session Brief ───────────────────────────────────────────────────────

export interface PreSessionBriefEmailData {
  displayName: string | null | undefined;
  course: string;
  startTime: string;
  sessionId: string;
  brief: {
    likelyCoverage: string[];
    weakSpotsToWatch: string[];
    warmUpExercise: { title: string; prompt: string; hint?: string };
    questionsToAsk: string[];
  };
}

/** Verified pre-session brief — structured sections in HTML. */
export async function sendPreSessionBriefEmail(
  studentEmail: string,
  data: PreSessionBriefEmailData
): Promise<void> {
  const hi = greetingFirstName(data.displayName, studentEmail);
  const sessionUrl = `${APP_URL}/student`;
  const startLabel = formatDateTime(data.startTime);

  const coverageBullets = data.brief.likelyCoverage
    .map(
      (item) =>
        `<li style="margin:0 0 6px;color:#d1d5db;font-size:14px;line-height:1.55;">${escapeHtml(item)}</li>`
    )
    .join("");

  const weakSpotsBullets = data.brief.weakSpotsToWatch
    .map(
      (item) =>
        `<li style="margin:0 0 6px;color:#d1d5db;font-size:14px;line-height:1.55;">${escapeHtml(item)}</li>`
    )
    .join("");

  const questionsBullets = data.brief.questionsToAsk
    .map(
      (q) =>
        `<li style="margin:0 0 6px;color:#d1d5db;font-size:14px;line-height:1.55;">&ldquo;${escapeHtml(q)}&rdquo;</li>`
    )
    .join("");

  const warmUp = data.brief.warmUpExercise;
  const warmUpHint = warmUp.hint
    ? `<p style="margin:10px 0 0;color:#9ca3af;font-size:13px;font-style:italic;">Hint: ${escapeHtml(warmUp.hint)}</p>`
    : "";

  const body = `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 20px;">
      Your <strong style="color:#eee;">${escapeHtml(data.course)}</strong> session starts at <strong style="color:#eee;">${escapeHtml(startLabel)}</strong>.
      Here's your verified pre-session receipt from rolling stats and item bank warm-ups.
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;border-collapse:collapse;">
      <tr>
        <td style="padding:16px;background:#161616;border:1px solid #2a2a2a;border-radius:10px;border-left:3px solid #3b82f6;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">What you'll likely cover</p>
          <ul style="margin:0;padding-left:18px;">${coverageBullets}</ul>
        </td>
      </tr>
    </table>

    ${
      weakSpotsBullets
        ? `<table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;border-collapse:collapse;">
      <tr>
        <td style="padding:16px;background:#161616;border:1px solid #2a2a2a;border-radius:10px;border-left:3px solid #f59e0b;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Weak spots to watch</p>
          <ul style="margin:0;padding-left:18px;">${weakSpotsBullets}</ul>
        </td>
      </tr>
    </table>`
        : ""
    }

    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;border-collapse:collapse;">
      <tr>
        <td style="padding:16px;background:#161616;border:1px solid #2a2a2a;border-radius:10px;border-left:3px solid #10b981;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">2-min warm-up: ${escapeHtml(warmUp.title)}</p>
          <p style="margin:0;color:#e5e7eb;font-size:14px;line-height:1.6;">${escapeHtml(warmUp.prompt)}</p>
          ${warmUpHint}
        </td>
      </tr>
    </table>

    ${
      questionsBullets
        ? `<table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;border-collapse:collapse;">
      <tr>
        <td style="padding:16px;background:#161616;border:1px solid #2a2a2a;border-radius:10px;border-left:3px solid #8b5cf6;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Questions to ask your Guide</p>
          <ul style="margin:0;padding-left:18px;">${questionsBullets}</ul>
        </td>
      </tr>
    </table>`
        : ""
    }

    ${ctaButton(sessionUrl, "Open Mentrixa")}
  `;

  await sendEmail(
    studentEmail,
    `${hi}, your ${data.course} session is in 2 hours, see your brief`,
    baseTemplate("Your Pre-Session Brief is ready", body)
  );
}

// ─── AI Package ready ────────────────────────────────────────────────────────

export async function sendAiPackageReadyEmail(
  studentEmail: string,
  session: SessionEmailDetails
): Promise<void> {
  const hi = greetingFirstName(session.studentDisplayName ?? session.studentName, studentEmail);
  const kp = session.keyPointsCount ?? 0;
  const fc = session.flashcardsCount ?? 0;
  const fq = session.followupQuestsCount ?? 0;
  const pe = session.practiceExercisesCount ?? 0;
  const preview = session.packageSummaryPreview?.trim();

  const statsLine = [
    kp ? `${kp} key point${kp === 1 ? "" : "s"}` : null,
    fc ? `${fc} flashcard${fc === 1 ? "" : "s"}` : null,
    pe ? `${pe} exercise${pe === 1 ? "" : "s"}` : null,
    fq ? `${fq} follow-up quest${fq === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const previewBlock = preview
    ? `<p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:12px 0 0;padding:12px 14px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;border-left:3px solid #6366f1;"><span style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;">Summary preview</span><br /><span style="color:#d1d5db;">${escapeHtml(preview.length > 320 ? `${preview.slice(0, 320)}…` : preview)}</span></p>`
    : "";

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Your  study package for <strong style="color:#eee;">${escapeHtml(session.course)}</strong> is ready, built from your real session, not generic filler. ${statsLine ? `Inside: <strong style="color:#ddd;">${escapeHtml(statsLine)}</strong>.` : "Open it for the full summary, cards, and quests."}</p>
    ${previewBlock}
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0 0;border-collapse:collapse;">
      ${detailRow("Course", escapeHtml(session.course))}
      ${detailRow("Session window", `${formatDateTime(session.startTime)} → ${formatTimeOnly(session.endTime)}`)}
      ${detailRow("Package stats", statsLine || "Summary & practice materials")}
    </table>
    ${ctaButton(`${APP_URL}/student`, "Open your package on Mentrixa")}`;

  await sendEmail(
    studentEmail,
    `${hi}, your ${session.course} Quest package is ready · Mentrixa`,
    baseTemplate("Your Quest Study Package is ready", body)
  );
}

// ─── Session completed (alias) ───────────────────────────────────────────────

/** session_completed_student — alias for AI Study Package email */
export async function sendSessionCompletedStudentEmail(
  studentEmail: string,
  session: SessionEmailDetails
): Promise<void> {
  return sendAiPackageReadyEmail(studentEmail, session);
}

// ─── Session cancelled ───────────────────────────────────────────────────────

export type SessionCancelledByRole = "learner" | "guide" | "mentrixa";

export interface SessionCancelledStudentEmailProps {
  displayName?: string | null;
  session: SessionEmailDetails;
  cancelledBy: SessionCancelledByRole;
  /** One line, e.g. "Full refund of $45 within 5–10 business days." */
  refundSummary: string;
  /** Optional XP grant when a Guide cancels (goodwill). */
  compensationXp?: number | null;
  /** Defaults to "Your {course} session has been cancelled". */
  emailSubject?: string;
  /** Primary button label (default: Book again). */
  primaryCtaLabel?: string;
}

function labelCancelledBy(role: SessionCancelledByRole): string {
  if (role === "learner") return "You cancelled this session.";
  if (role === "guide") return "Your Guide cancelled this session.";
  return "Mentrixa cancelled this session.";
}

/** session_cancelled_student */
export async function sendSessionCancelledStudentEmail(
  studentEmail: string,
  data: SessionCancelledStudentEmailProps
): Promise<void> {
  const hi = greetingFirstName(data.displayName ?? data.session.studentDisplayName ?? data.session.studentName, studentEmail);
  const when = formatDateTime(data.session.startTime);

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">${escapeHtml(labelCancelledBy(data.cancelledBy))}</p>
    ${sessionFactsTable(data.session, { includePartner: "tutor" })}
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:12px 0 0;border-collapse:collapse;">
      ${detailRow("Was scheduled for", escapeHtml(when))}
      ${detailRow("Refund", escapeHtml(data.refundSummary))}
      ${
        data.compensationXp != null && data.compensationXp > 0
          ? detailRow("XP compensation", `+${data.compensationXp} XP`)
          : ""
      }
    </table>
    ${ctaButton(`${APP_URL}/student`, data.primaryCtaLabel ?? "Book again")}`;

  await sendEmail(
    studentEmail,
    data.emailSubject ?? `Your ${data.session.course} session has been cancelled`,
    baseTemplate("Session cancelled", body)
  );
}

// ─── Rating request ──────────────────────────────────────────────────────────

export interface RatingRequestEmailProps {
  studentDisplayName?: string | null;
  tutorDisplayName: string;
  sessionId: string;
  course: string;
}

/** rating_request — 1-click star rows + fallback */
export async function sendRatingRequestEmail(
  studentEmail: string,
  data: RatingRequestEmailProps
): Promise<void> {
  const hi = greetingFirstName(data.studentDisplayName, studentEmail);
  const stars = starRatingLinks(data.sessionId, data.tutorDisplayName);

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 16px;">How was your <strong style="color:#eee;">${escapeHtml(data.course)}</strong> session? Tap a row to record stars (opens Mentrixa to confirm).</p>
    ${stars}`;

  await sendEmail(
    studentEmail,
    `How was your session with ${data.tutorDisplayName}?`,
    baseTemplate("Rate your session", body)
  );
}

// ─── Payment failed ──────────────────────────────────────────────────────────

export interface PaymentFailedEmailData {
  course: string;
  startTime: string;
  reason: string;
  retryUrl: string;
}

export async function sendPaymentFailedEmail(
  studentEmail: string,
  data: PaymentFailedEmailData
): Promise<void> {
  const hi = greetingFirstName(undefined, studentEmail);
  const sessionDate = data.startTime
    ? new Date(data.startTime).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  const body = `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
    </p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      We were unable to process your payment for the
      <strong style="color:#eee;">${escapeHtml(data.course)}</strong> session
      ${sessionDate ? `on <strong style="color:#eee;">${escapeHtml(sessionDate)}</strong>` : ""}.
      The slot has been released and is available for you to book again.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0;border-collapse:collapse;">
      ${detailRow("Course", escapeHtml(data.course))}
      ${sessionDate ? detailRow("Session date", escapeHtml(sessionDate)) : ""}
      ${detailRow("Reason", escapeHtml(data.reason))}
    </table>
    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 20px;">
      No charge was made to your card. You can rebook the slot if it is still available.
    </p>
    ${ctaButton(data.retryUrl, "Find a session")}
  `;

  await sendEmail(
    studentEmail,
    `Payment unsuccessful for your ${escapeHtml(data.course)} session`,
    baseTemplate("Payment unsuccessful", body)
  );
}

// ─── Refund issued ───────────────────────────────────────────────────────────

export interface RefundIssuedEmailData {
  course: string;
  startTime: string;
  refundCents: number | null;
  studentName: string | null;
  tutorName: string | null;
}

export async function sendRefundIssuedEmail(
  recipientEmail: string,
  data: RefundIssuedEmailData
): Promise<void> {
  const hi = greetingFirstName(data.studentName, recipientEmail);
  const sessionDate = data.startTime
    ? formatDateTime(data.startTime)
    : "";
  const refundText = data.refundCents
    ? `<strong style="color:#eee;">${formatPriceUsd(data.refundCents)}</strong>`
    : "your full payment";

  const body = `
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
    </p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
      Your refund of ${refundText} for the
      <strong style="color:#eee;">${escapeHtml(data.course)}</strong> session
      has been issued. It will appear on your statement within 5–10 business days.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0;border-collapse:collapse;">
      ${detailRow("Course", escapeHtml(data.course))}
      ${sessionDate ? detailRow("Session date", escapeHtml(sessionDate)) : ""}
      ${data.refundCents ? detailRow("Refund amount", escapeHtml(formatPriceUsd(data.refundCents) ?? "")) : ""}
      ${detailRow("Timeline", "5–10 business days")}
    </table>
    ${ctaButton(`${APP_URL}/student`, "View your account")}
  `;

  await sendEmail(
    recipientEmail,
    `Refund issued for your ${data.course} session`,
    baseTemplate("Your refund is on the way", body)
  );
}

// ─── Student cancelled ───────────────────────────────────────────────────────

export interface StudentCancelledEmailData extends SessionEmailDetails {
  refunded: boolean;
  refundCents: number | null;
  recipientRole?: "student" | "tutor";
}

export async function sendStudentCancelledEmail(
  recipientEmail: string,
  data: StudentCancelledEmailData
): Promise<void> {
  if (data.recipientRole !== "tutor") {
    const refundSummary =
      data.refunded && data.refundCents
        ? `Full refund of ${formatPriceUsd(data.refundCents) ?? ""} — funds typically arrive within 5–10 business days.`
        : data.refunded
          ? "Full refund issued — funds typically arrive within 5–10 business days."
          : "No refund applies (cancellation within 24 hours of the session).";
    return sendSessionCancelledStudentEmail(recipientEmail, {
      displayName: data.studentDisplayName ?? data.studentName,
      session: data,
      cancelledBy: "learner",
      refundSummary,
    });
  }

  const hi = greetingFirstName(data.tutorDisplayName ?? data.tutorName, recipientEmail);
  const sessionDate = formatDateTime(data.startTime);

  const body = `
      <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
        Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
      </p>
      <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
        Your learner has cancelled the
        <strong style="color:#eee;">${escapeHtml(data.course)}</strong> session
        scheduled for <strong style="color:#eee;">${escapeHtml(sessionDate)}</strong>.
      </p>
      <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Your slot has been reopened and is available for other learners.
      </p>
      ${ctaButton(`${APP_URL}/tutor`, "View your schedule")}
    `;

  await sendEmail(
    recipientEmail,
    `Learner cancelled: ${data.course} session on ${sessionDate}`,
    baseTemplate("Session cancelled", body)
  );
}

// ─── Tutor cancelled ─────────────────────────────────────────────────────────

export interface TutorCancelledEmailData extends SessionEmailDetails {
  xpCompensation: number;
  refundCents: number | null;
  recipientRole?: "student" | "tutor";
}

export async function sendTutorCancelledEmail(
  recipientEmail: string,
  data: TutorCancelledEmailData
): Promise<void> {
  const isStudent = data.recipientRole !== "tutor";
  if (isStudent) {
    const refundSummary =
      data.refundCents != null
        ? `Full refund of ${formatPriceUsd(data.refundCents) ?? ""} — funds typically arrive within 5–10 business days.`
        : "Full refund issued — funds typically arrive within 5–10 business days.";
    return sendSessionCancelledStudentEmail(recipientEmail, {
      displayName: data.studentDisplayName ?? data.studentName,
      session: data,
      cancelledBy: "guide",
      refundSummary,
      compensationXp: data.xpCompensation > 0 ? data.xpCompensation : null,
      emailSubject: `Your Guide cancelled: ${data.course} session — refund issued`,
      primaryCtaLabel: "Find another session",
    });
  }

  const hi = greetingFirstName(data.tutorDisplayName ?? data.tutorName, recipientEmail);
  const sessionDate = formatDateTime(data.startTime);

  const body = `
      <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
        Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,
      </p>
      <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 14px;">
        You have cancelled the <strong style="color:#eee;">${escapeHtml(data.course)}</strong>
        session on <strong style="color:#eee;">${escapeHtml(sessionDate)}</strong>.
        Your learner will receive a full refund.
      </p>
      <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 20px;">
        Please note: frequent cancellations may affect your Guide status on Mentrixa.
      </p>
      ${ctaButton(`${APP_URL}/tutor`, "View your schedule")}
    `;

  await sendEmail(
    recipientEmail,
    `Cancellation confirmed: ${data.course} session`,
    baseTemplate("Session cancelled by Guide", body)
  );
}

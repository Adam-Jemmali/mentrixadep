/**
 * Email notifications via Resend.
 * Copy leans on Mentrixa’s Mentrixer identity — learners and guides on one serious-learning platform.
 * All functions are fire-and-forget — they log errors but never throw.
 *
 * Transactional suite (HTML via `baseTemplate`): sendWelcomeStudentEmail, sendWelcomeTutorEmail,
 * sendSessionConfirmedStudentEmail, sendSessionConfirmedTutorEmail, sendSessionReminderStudentEmail,
 * sendSessionReminderTutorEmail, sendSessionCancelledStudentEmail, sendSessionCompletedStudentEmail,
 * sendRatingRequestEmail, sendPreSessionBriefEmail, sendLevelUpEmail, sendDuelChallengeEmail,
 * sendReferralSuccessEmail, sendPasswordResetEmail, sendTutorApprovedEmail, sendTutorPayoutEmail.
 * Legacy / flow-specific: sendSessionBookedEmail, sendSessionApprovedEmail, sendSessionReminderEmail,
 * sendAiPackageReadyEmail, sendPaymentFailedEmail, sendRefundIssuedEmail, sendStudentCancelledEmail,
 * sendTutorCancelledEmail, sendVerification* …
 */

import { getResendApiKey } from "@/lib/env";
import { DEFAULT_PUBLIC_FEEDBACK_EMAIL } from "@/lib/mentrixa-brand";

const FROM_ADDRESS = "Mentrixa <updates@mentrixa.one>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000" || "https://mentrixa.one";
const DEV_EMAIL_OVERRIDE: string | null = null;

/** Session + optional person names + optional AI package stats for richer emails */
export interface SessionEmailDetails {
  sessionId: string;
  course: string;
  startTime: string;
  endTime: string;
  /** Preferred: Settings display name for tutor */
  tutorDisplayName?: string | null;
  /** Preferred: Settings display name for student */
  studentDisplayName?: string | null;
  /** Legacy — same as tutorDisplayName when set */
  tutorName?: string;
  /** Legacy — same as studentDisplayName when set */
  studentName?: string;
  /** For reminder cron: minutes before start (default 30) */
  reminderMinutesBefore?: number;
  /** Fee for this session in cents (Stripe / availability) */
  priceCents?: number | null;
  /** AI package — short plain-text preview (escaped when rendered) */
  packageSummaryPreview?: string | null;
  keyPointsCount?: number;
  flashcardsCount?: number;
  followupQuestsCount?: number;
  practiceExercisesCount?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** First name for “Hi, …” from Settings name or email local-part */
export function greetingFirstName(
  displayName: string | null | undefined,
  email?: string | null
): string {
  const fromDisplay = displayName?.trim().split(/\s+/)[0];
  if (fromDisplay) {
    return fromDisplay.charAt(0).toUpperCase() + fromDisplay.slice(1);
  }
  const local = email?.split("@")[0]?.replace(/[._]+/g, " ").trim() ?? "";
  const part = local.split(/\s+/)[0];
  if (part) {
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }
  return "Mentrixer";
}

function tutorLabel(s: SessionEmailDetails): string | undefined {
  const v = (s.tutorDisplayName ?? s.tutorName)?.trim();
  return v || undefined;
}

function studentLabel(s: SessionEmailDetails): string | undefined {
  const v = (s.studentDisplayName ?? s.studentName)?.trim();
  return v || undefined;
}

function durationMinutes(s: SessionEmailDetails): number {
  const a = new Date(s.startTime).getTime();
  const b = new Date(s.endTime).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 30;
  return Math.max(1, Math.round((b - a) / 60_000));
}

function formatDurationHuman(mins: number): string {
  if (mins < 60) return `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h} h ${m} min`;
}

function formatPriceUsd(cents: number | null | undefined): string | undefined {
  if (cents == null || !Number.isFinite(cents)) return undefined;
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeStyle: "short",
  });
}

const MENTRIXER_LINE =
  'On Mentrixa, learners and tutors are <strong style="color:#e5e5e5;">Mentrixers</strong> — one community built for depth, not noise.';

const HEADER_LOGO_SRC = `${APP_URL}/mentrixa-checkout-logo.svg`;

function googleCalendarTemplateUrl(params: {
  title: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
}): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const text = encodeURIComponent(params.title);
  const details = encodeURIComponent(params.description);
  const dates = `${fmt(params.start)}/${fmt(params.end)}`;
  let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
  if (params.location) url += `&location=${encodeURIComponent(params.location)}`;
  return url;
}

function secondaryLink(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:12px;margin-right:16px;color:#93c5fd;font-size:13px;text-decoration:underline;">${escapeHtml(label)}</a>`;
}

function starRatingLinks(sessionId: string, tutorDisplayName: string): string {
  const base = `${APP_URL}/student?rateSession=${encodeURIComponent(sessionId)}`;
  const stars = [1, 2, 3, 4, 5].map(
    (n) =>
      `<a href="${base}&stars=${n}" style="display:inline-block;margin:4px 4px 0 0;padding:8px 10px;background:#1a1a1a;border:1px solid #333;border-radius:6px;color:#fbbf24;font-size:16px;text-decoration:none;font-weight:600;" title="Rate ${n} star${n === 1 ? "" : "s"}">${"★".repeat(n)}</a>`
  );
  return `<p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">How was your session with <strong style="color:#e5e5e5;">${escapeHtml(tutorDisplayName)}</strong>?</p><p style="margin:0;">${stars.join("")}</p>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const apiKey = getResendApiKey();
    const recipient = DEV_EMAIL_OVERRIDE ?? to;
    const devNote =
      DEV_EMAIL_OVERRIDE && DEV_EMAIL_OVERRIDE !== to ? ` [DEV: originally to ${to}]` : "";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: recipient,
        subject: subject + devNote,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Failed to send "${subject}" to ${recipient} (originally: ${to}):`, body);
    }
  } catch (err) {
    console.error(`[email] Unexpected error sending "${subject}" to ${to}:`, err);
  }
}

function baseTemplate(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #262626;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <tr>
            <td style="background:#0c0c0c;padding:24px 36px;border-bottom:1px solid #1f1f1f;">
              <img src="${HEADER_LOGO_SRC}" alt="Mentrixa" width="140" height="32" style="display:block;height:auto;max-width:140px;" />
              <p style="margin:12px 0 0;color:#a3a3a3;font-size:12px;line-height:1.5;">
                Serious learning — learners &amp; guides together
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 36px 28px;">
              <h2 style="margin:0 0 14px;color:#f5f5f5;font-size:20px;font-weight:600;letter-spacing:-0.02em;">${escapeHtml(title)}</h2>
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid #222;">
              <p style="margin:0;color:#666;font-size:12px;line-height:1.55;text-align:center;">
                ${MENTRIXER_LINE}
              </p>
              <p style="margin:16px 0 0;color:#444;font-size:11px;text-align:center;">
                © ${new Date().getFullYear()} Mentrixa ·
                <a href="${APP_URL}" style="color:#60a5fa;text-decoration:none;">Open Mentrixa</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#888;font-size:13px;width:132px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;color:#f5f5f5;font-size:14px;vertical-align:top;font-weight:500;">${value}</td>
  </tr>`;
}

function ctaButton(href: string, text: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:22px;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${escapeHtml(text)}</a>`;
}

function sessionFactsTable(s: SessionEmailDetails, opts: { includePrice?: boolean; includePartner?: "tutor" | "student" | "both" }): string {
  const dur = durationMinutes(s);
  const price = opts.includePrice ? formatPriceUsd(s.priceCents ?? undefined) : undefined;
  const tutor = tutorLabel(s);
  const student = studentLabel(s);

  let partnerRows = "";
  if (opts.includePartner === "tutor" || opts.includePartner === "both") {
    if (tutor) partnerRows += detailRow("Guide (tutor)", escapeHtml(tutor));
  }
  if (opts.includePartner === "student" || opts.includePartner === "both") {
    if (student) partnerRows += detailRow("Learner (student)", escapeHtml(student));
  }

  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0;border-collapse:collapse;">
    ${detailRow("Course", escapeHtml(s.course))}
    ${detailRow("Starts", formatDateTime(s.startTime))}
    ${detailRow("Ends", formatDateTime(s.endTime))}
    ${detailRow("Length", formatDurationHuman(dur))}
    ${price ? detailRow("Session fee", price) : ""}
    ${partnerRows}
  </table>`;
}

// ─── Email senders ───────────────────────────────────────────────────────────

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
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">A learner on Mentrixa${studentNamed ? ` (${escapeHtml(studentNamed)})` : ""} requested this session. You’re their guide — approve or decline from your tutor home.</p>
    <p style="color:#999;font-size:13px;line-height:1.55;margin:0;">Times and duration match the availability block they picked.</p>`;

  const studentBody = `${studentIntro}${sessionFactsTable(session, { includePrice: true, includePartner: "tutor" })}${ctaButton(`${APP_URL}/student`, "Open my sessions")}`;
  const tutorBody = `${tutorIntro}${sessionFactsTable(session, { includePrice: true, includePartner: "student" })}${ctaButton(`${APP_URL}/tutor`, "Review session request")}`;

  await Promise.all([
    sendEmail(
      studentEmail,
      `${stuHi}, your ${session.course} request is in — Mentrixa`,
      baseTemplate("Request received — we’ve got it", studentBody)
    ),
    sendEmail(
      tutorEmail,
      `${tutHi}, new Mentrixa session request — ${session.course}`,
      baseTemplate("A learner chose you", tutorBody)
    ),
  ]);
}

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
          <li style="margin:0;">Your Pre‑Session Brief lands on your dashboard before the session — use it as a warm‑up.</li>
        </ul>
      </td>
    </tr>
  </table>`;

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">You’re confirmed. When it’s time, you and your Guide join the same Mentrixa room — same course, same clock.</p>
    ${guide ? `<p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 12px;">Guide: <strong style="color:#ddd;">${escapeHtml(guide)}</strong></p>` : ""}
    ${sessionFactsTable(session, { includePrice: true, includePartner: "tutor" })}
    ${tips}
    <p style="margin:0 0 8px;color:#737373;font-size:12px;">Add to Google Calendar</p>
    <p style="margin:0;">${secondaryLink(calUrl, "Open Google Calendar template")}</p>
    ${ctaButton(`${APP_URL}/student`, "View session & join link")}`;

  await sendEmail(
    studentEmail,
    `${hi}, you’re on — ${session.course} is confirmed · Mentrixa`,
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
    ${ctaButton(`${APP_URL}/tutor`, "Open tutor home")}`;

  await sendEmail(
    tutorEmail,
    `${hi}, new booking — ${session.course} · Mentrixa`,
    baseTemplate("New booking on your calendar", body)
  );
}

export interface SessionReminderStudentEmailProps extends SessionEmailDetails {
  /** Default 120 for the “two hours before” learner reminder. */
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

// ─── Pre-Session Brief email (template: pre_session_brief) ─────────────────────

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

/** AI-generated Pre-Session Brief — structured sections in HTML. */
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
      Here's your AI-prepared brief — two minutes of reading, a lot more value in the session.
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
    `${hi}, your ${data.course} session is in 2 hours — see your brief`,
    baseTemplate("Your Pre-Session Brief is ready", body)
  );
}

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
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Your AI study package for <strong style="color:#eee;">${escapeHtml(session.course)}</strong> is ready — built from your real session, not generic filler. ${statsLine ? `Inside: <strong style="color:#ddd;">${escapeHtml(statsLine)}</strong>.` : "Open it for the full summary, cards, and quests."}</p>
    ${previewBlock}
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0 0;border-collapse:collapse;">
      ${detailRow("Course", escapeHtml(session.course))}
      ${detailRow("Session window", `${formatDateTime(session.startTime)} → ${formatTimeOnly(session.endTime)}`)}
      ${detailRow("Package stats", statsLine || "Summary & practice materials")}
    </table>
    ${ctaButton(`${APP_URL}/student`, "Open your package on Mentrixa")}`;

  await sendEmail(
    studentEmail,
    `${hi}, your ${session.course} AI package is ready · Mentrixa`,
    baseTemplate("Your AI Study Package is ready", body)
  );
}

// ─── Transactional suite (welcome, engagement, auth) ─────────────────────────

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
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Welcome to Mentrixa. You’re a <strong style="color:#eee;">Learner</strong> here — we match you with expert Guides for live sessions and turn every hour into practice you can keep.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:14px 16px;background:#161616;border:1px solid #262626;border-radius:8px;">
          <p style="margin:0 0 8px;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Your first session</p>
          <ol style="margin:0;padding-left:18px;color:#a3a3a3;font-size:14px;line-height:1.55;">
            <li style="margin:0 0 6px;">Pick a course and browse Guide availability.</li>
            <li style="margin:0 0 6px;">Book a slot — you’ll get a calendar confirmation and a Pre‑Session Brief before you meet.</li>
            <li style="margin:0;">Join from Mentrixa video when it’s time.</li>
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
  /** Stripe Connect onboarding URL */
  stripeConnectUrl?: string;
}

/** welcome_tutor */
export async function sendWelcomeTutorEmail(
  tutorEmail: string,
  props: WelcomeTutorEmailProps = {}
): Promise<void> {
  const hi = greetingFirstName(props.displayName, tutorEmail);
  const stripeUrl = props.stripeConnectUrl ?? `${APP_URL}/tutor`;

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Welcome to Mentrixa as a <strong style="color:#eee;">Guide</strong>. Learners book you for live sessions; you stay in control of your availability and your payouts.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:collapse;">
      <tr>
        <td style="padding:14px 16px;background:#161616;border:1px solid #262626;border-radius:8px;">
          <p style="margin:0 0 8px;color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Onboarding checklist</p>
          <ul style="margin:0;padding-left:18px;color:#a3a3a3;font-size:14px;line-height:1.55;">
            <li style="margin:0 0 6px;">Set your subjects and weekly availability.</li>
            <li style="margin:0 0 6px;">Connect Stripe so we can pay you after sessions.</li>
            <li style="margin:0;">Respond to booking requests from your tutor home.</li>
          </ul>
        </td>
      </tr>
    </table>
    ${ctaButton(stripeUrl, "Set up payouts with Stripe")}`;

  await sendEmail(
    tutorEmail,
    `${hi}, welcome to Mentrixa — Guides`,
    baseTemplate("Welcome, Guide", body)
  );
}

export type SessionCancelledByRole = "learner" | "guide" | "mentrixa";

export interface SessionCancelledStudentEmailProps {
  displayName?: string | null;
  session: SessionEmailDetails;
  cancelledBy: SessionCancelledByRole;
  /** One line, e.g. “Full refund of $45 within 5–10 business days.” */
  refundSummary: string;
  /** Optional XP grant when a Guide cancels (goodwill). */
  compensationXp?: number | null;
  /** Defaults to “Your {course} session has been cancelled”. */
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

/** session_completed_student — alias for AI Study Package email */
export async function sendSessionCompletedStudentEmail(
  studentEmail: string,
  session: SessionEmailDetails
): Promise<void> {
  return sendAiPackageReadyEmail(studentEmail, session);
}

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
  const badgeSrc = props.badgeImageUrl ?? `${APP_URL}/mentrixa-checkout-icon.svg`;

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

export interface PasswordResetEmailProps {
  resetLink: string;
}

/** password_reset */
export async function sendPasswordResetEmail(email: string, props: PasswordResetEmailProps): Promise<void> {
  const hi = greetingFirstName(undefined, email);

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">We received a request to reset your Mentrixa password. Use the button below — the link expires for your security.</p>
    <p style="color:#737373;font-size:12px;line-height:1.5;margin:0 0 20px;">If you didn’t ask for this, you can ignore this email.</p>
    ${ctaButton(props.resetLink, "Reset password")}`;

  await sendEmail(
    email,
    "Reset your Mentrixa password",
    baseTemplate("Password reset", body)
  );
}

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
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Your tutor application was <strong style="color:#eee;">approved</strong>. You can publish availability, accept learners, and get paid through Stripe Connect.</p>
    <p style="color:#737373;font-size:13px;line-height:1.55;margin:0 0 20px;">Finish onboarding in the tutor home if you haven’t already — availability and payouts are both required before learners can book.</p>
    ${ctaButton(`${APP_URL}/tutor`, "Go to tutor home")}`;

  await sendEmail(
    tutorEmail,
    `${hi}, your Guide application is approved · Mentrixa`,
    baseTemplate("You’re approved", body)
  );
}

export interface TutorPayoutEmailProps {
  displayName?: string | null;
  amountCents: number;
  /** e.g. “Arrives Apr 5–7” */
  arrivalEstimate?: string | null;
}

/** tutor_payout */
export async function sendTutorPayoutEmail(tutorEmail: string, props: TutorPayoutEmailProps): Promise<void> {
  const hi = greetingFirstName(props.displayName, tutorEmail);
  const amt = formatPriceUsd(props.amountCents) ?? "$0.00";
  const arrival = props.arrivalEstimate?.trim();

  const body = `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    <p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 12px;">Your payout of <strong style="color:#eee;">${escapeHtml(amt)}</strong> is on its way to your connected bank account.</p>
    ${arrival ? `<table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;border-collapse:collapse;">${detailRow("Estimated arrival", escapeHtml(arrival))}</table>` : ""}
    <p style="color:#737373;font-size:13px;line-height:1.55;margin:0 0 20px;">Details appear in your Stripe payouts dashboard and in Mentrixa earnings.</p>
    ${ctaButton(`${APP_URL}/tutor`, "View earnings")}`;

  await sendEmail(
    tutorEmail,
    `Payout of ${amt} is on the way · Mentrixa`,
    baseTemplate("Payout sent", body)
  );
}

// ─── Payment failed ───────────────────────────────────────────────────────────

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

// ─── Refund issued ────────────────────────────────────────────────────────────

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

// ─── Student cancelled ────────────────────────────────────────────────────────

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

// ─── Verification emails ──────────────────────────────────────────────────────

export interface VerificationStartedEmailData {
  displayName?: string | null;
  email: string;
  role: "tutor" | "student";
  deadlineHours: number; // 24 for tutor, 48 for student
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
      Welcome to Mentrixa. Your account is being verified by our team — this typically completes within
      <strong style="color:#eee;">${hours} hours</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0 20px;border-collapse:collapse;">
      <tr>
        <td style="padding:16px;background:#161616;border:1px solid #2a2a2a;border-radius:10px;border-left:3px solid #22c55e;">
          <p style="margin:0 0 10px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">While we verify your account</p>
          <ul style="margin:0;padding-left:18px;">
            <li style="margin:0 0 6px;color:#d1d5db;font-size:14px;line-height:1.55;">You have <strong style="color:#eee;">full access</strong> to Mentrixa — no restrictions during review</li>
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
    baseTemplate("You're verified — welcome to Mentrixa", body)
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
    ${ctaButton(`${APP_URL}/auth/signin`, "Sign in to Mentrixa")}
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

/** Public contact form → team inbox via Resend (`reply_to` = sender so you can reply in one click). */
export async function sendContactFeedbackInbound(params: {
  fromEmail: string;
  fromName: string;
  category: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  /** Same inbox as mailto when possible: form submissions + “email us” land in one place. */
  const inbox =
    process.env.CONTACT_INBOX_EMAIL?.trim() || DEFAULT_PUBLIC_FEEDBACK_EMAIL;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set");
    return { ok: false, error: "Email is not configured on this server." };
  }

  const subject = `[Mentrixa Feedback] ${params.category} — ${params.fromName}`;
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
      <p style="color:#737373;font-size:12px;line-height:1.5;margin:0;">
        Reply directly to the sender using Reply in your inbox — Resend sets Reply-To to their address.
      </p>
    `;

  try {
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
        html: baseTemplate("Feedback from mentrixa.com", body),
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

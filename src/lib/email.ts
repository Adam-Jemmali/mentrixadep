/**
 * Email notifications via Resend.
 * All functions are fire-and-forget — they log errors but never throw,
 * so a failed email never blocks the main action.
 */

import { getResendApiKey } from "@/lib/env";

export interface SessionEmailDetails {
  sessionId: string;
  course: string;
  startTime: string;
  endTime: string;
  tutorName?: string;
  studentName?: string;
}

const FROM_ADDRESS = "Mentrixa <updates@mentrixa.one>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const DEV_EMAIL_OVERRIDE: string | null = null;

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const apiKey = getResendApiKey();
    // In development, redirect all emails to the dev address so Resend test mode works
    const recipient = DEV_EMAIL_OVERRIDE ?? to;
    const devNote = DEV_EMAIL_OVERRIDE && DEV_EMAIL_OVERRIDE !== to
      ? ` [DEV: originally to ${to}]`
      : "";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: recipient, subject: subject + devNote, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Failed to send "${subject}" to ${recipient} (originally: ${to}):`, body);
    }
  } catch (err) {
    console.error(`[email] Unexpected error sending "${subject}" to ${to}:`, err);
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function baseTemplate(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#00c875 0%,#7c3aed 100%);padding:32px 40px;">
              <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Mentrixa</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Learning, leveled up</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#f5f5f5;font-size:22px;font-weight:600;">${title}</h2>
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #222;">
              <p style="margin:0;color:#555;font-size:12px;text-align:center;">
                © ${new Date().getFullYear()} Mentrixa · <a href="${APP_URL}" style="color:#00c875;text-decoration:none;">Visit Mentrixa</a>
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
    <td style="padding:8px 0;color:#888;font-size:14px;width:130px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#f5f5f5;font-size:14px;vertical-align:top;font-weight:500;">${value}</td>
  </tr>`;
}

function ctaButton(href: string, text: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:linear-gradient(135deg,#00c875,#7c3aed);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">${text}</a>`;
}

// ─── Email senders ────────────────────────────────────────────────────────────

export async function sendSessionBookedEmail(
  studentEmail: string,
  tutorEmail: string,
  session: SessionEmailDetails
): Promise<void> {
  const details = `<table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;">
    ${detailRow("Course", session.course)}
    ${detailRow("Date & Time", formatDateTime(session.startTime))}
    ${detailRow("Duration", "30 minutes")}
    ${session.tutorName ? detailRow("Tutor", session.tutorName) : ""}
  </table>`;

  const studentBody = `
    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 8px;">Your session request has been submitted successfully. The tutor will review and confirm shortly.</p>
    ${details}
    ${ctaButton(`${APP_URL}/student`, "View My Sessions")}
  `;

  const tutorBody = `
    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 8px;">A student has requested a session with you. Please review and approve or reject it.</p>
    ${details}
    ${ctaButton(`${APP_URL}/tutor`, "Review Request")}
  `;

  await Promise.all([
    sendEmail(studentEmail, "Session Request Submitted — Mentrixa", baseTemplate("Session Request Submitted", studentBody)),
    sendEmail(tutorEmail, "New Session Request — Mentrixa", baseTemplate("New Session Request", tutorBody)),
  ]);
}

export async function sendSessionApprovedEmail(
  studentEmail: string,
  session: SessionEmailDetails
): Promise<void> {
  const body = `
    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 8px;">Great news! Your tutor has approved your session. You can join the video call when it's time.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;">
      ${detailRow("Course", session.course)}
      ${detailRow("Date & Time", formatDateTime(session.startTime))}
      ${detailRow("Duration", "30 minutes")}
      ${session.tutorName ? detailRow("Tutor", session.tutorName) : ""}
    </table>
    ${ctaButton(`${APP_URL}/student`, "View Session")}
  `;

  await sendEmail(
    studentEmail,
    "Session Approved ✓ — Mentrixa",
    baseTemplate("Your Session is Confirmed!", body)
  );
}

export async function sendSessionReminderEmail(
  recipientEmail: string,
  session: SessionEmailDetails,
  role: "student" | "tutor"
): Promise<void> {
  const intro =
    role === "student"
      ? "Your tutoring session starts in 30 minutes. Make sure you're ready to join."
      : "You have a tutoring session starting in 30 minutes.";

  const body = `
    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 8px;">${intro}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;">
      ${detailRow("Course", session.course)}
      ${detailRow("Starts at", formatDateTime(session.startTime))}
    </table>
    ${ctaButton(`${APP_URL}/video/session/${session.sessionId}`, "Join Video Call")}
  `;

  await sendEmail(
    recipientEmail,
    "Session Starting in 30 Minutes — Mentrixa",
    baseTemplate("Session Reminder ⏰", body)
  );
}

export async function sendAiPackageReadyEmail(
  studentEmail: string,
  session: SessionEmailDetails
): Promise<void> {
  const body = `
    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 8px;">Your AI study package for the <strong style="color:#f5f5f5;">${session.course}</strong> session is ready! It includes a summary, key points, flashcards, and follow-up quests.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;">
      ${detailRow("Course", session.course)}
      ${detailRow("Session Date", formatDateTime(session.startTime))}
    </table>
    ${ctaButton(`${APP_URL}/student`, "View AI Package")}
  `;

  await sendEmail(
    studentEmail,
    "Your AI Study Package is Ready 🤖 — Mentrixa",
    baseTemplate("AI Study Package Ready", body)
  );
}

/**
 * Email infrastructure — Resend client, send primitives, config constants, utility functions.
 * Internal module: consumed by session.ts, marketing.ts, and templates.ts.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getResendApiKey } from "@/shared/core/env";
import { DEFAULT_PUBLIC_FEEDBACK_EMAIL } from "@/features/marketing/mentrixa-brand";
import { getEmailAppBaseUrl, getEmailPublicAssetOrigin } from "@/shared/core/site";

export const FROM_ADDRESS = "Mentrixa <updates@mentrixa.one>";
export const WAITLIST_FROM_ADDRESS = "Mentrixa <noreply@mentrixa.one>";
export const APP_URL = getEmailAppBaseUrl();
/** Public HTTPS host for `/public` images in email HTML (not APP_URL when it is localhost). */
export const EMAIL_ASSET_ORIGIN = getEmailPublicAssetOrigin();
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

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** First name for "Hi, …" from Settings name or email local-part */
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

export function tutorLabel(s: SessionEmailDetails): string | undefined {
  const v = (s.tutorDisplayName ?? s.tutorName)?.trim();
  return v || undefined;
}

export function studentLabel(s: SessionEmailDetails): string | undefined {
  const v = (s.studentDisplayName ?? s.studentName)?.trim();
  return v || undefined;
}

export function durationMinutes(s: SessionEmailDetails): number {
  const a = new Date(s.startTime).getTime();
  const b = new Date(s.endTime).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 30;
  return Math.max(1, Math.round((b - a) / 60_000));
}

export function formatDurationHuman(mins: number): string {
  if (mins < 60) return `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h} h ${m} min`;
}

export function formatPriceUsd(cents: number | null | undefined): string | undefined {
  if (cents == null || !Number.isFinite(cents)) return undefined;
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeStyle: "short",
  });
}

// ─── Logo resolution ─────────────────────────────────────────────────────────

/** Resend inline attachment `content_id` — must match `<img src="cid:…">`. */
const HEADER_LOGO_CONTENT_ID = "mentrixa-header-logo";

export type ResendInlineAttachment = {
  filename: string;
  /** Raw base64 (no data: URL prefix). */
  content: string;
  content_id: string;
  content_type?: string;
};

let cachedHeaderLogo:
  | { kind: "cid"; base64: string }
  | { kind: "url"; href: string }
  | undefined;

/**
 * Prefer embedding `public/mentrixalogo/logo.webp` as a CID attachment so the logo renders
 * from localhost, Vercel, and production without relying on a fetchable absolute URL.
 * Falls back to HTTPS URL when the file is not on disk (e.g. mis-cwd).
 */
function resolveHeaderLogoForEmail():
  | { imgSrc: string; inlineAttachments: ResendInlineAttachment[] }
  | { imgSrc: string; inlineAttachments: [] } {
  if (cachedHeaderLogo === undefined) {
    try {
      const logoPath = join(process.cwd(), "public", "mentrixalogo", "logo.webp");
      if (existsSync(logoPath)) {
        const buf = readFileSync(logoPath);
        if (buf.length > 0 && buf.length < 900_000) {
          cachedHeaderLogo = { kind: "cid", base64: buf.toString("base64") };
        } else {
          cachedHeaderLogo = { kind: "url", href: `${EMAIL_ASSET_ORIGIN}/mentrixalogo/logo.webp` };
        }
      } else {
        cachedHeaderLogo = { kind: "url", href: `${EMAIL_ASSET_ORIGIN}/mentrixalogo/logo.webp` };
      }
    } catch {
      cachedHeaderLogo = { kind: "url", href: `${EMAIL_ASSET_ORIGIN}/mentrixalogo/logo.webp` };
    }
  }

  if (cachedHeaderLogo.kind === "cid") {
    return {
      imgSrc: `cid:${HEADER_LOGO_CONTENT_ID}`,
      inlineAttachments: [
        {
          filename: "mentrixa-logo.webp",
          content: cachedHeaderLogo.base64,
          content_id: HEADER_LOGO_CONTENT_ID,
          content_type: "image/webp",
        },
      ],
    };
  }
  return {
    imgSrc: cachedHeaderLogo.href,
    inlineAttachments: [],
  };
}

export function headerLogoImgSrc(): string {
  return resolveHeaderLogoForEmail().imgSrc;
}

export function headerLogoInlineAttachments(): ResendInlineAttachment[] {
  return resolveHeaderLogoForEmail().inlineAttachments;
}

// ─── Send primitives ─────────────────────────────────────────────────────────

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const apiKey = getResendApiKey();
    const recipient = DEV_EMAIL_OVERRIDE ?? to;
    const devNote =
      DEV_EMAIL_OVERRIDE && DEV_EMAIL_OVERRIDE !== to ? ` [DEV: originally to ${to}]` : "";
    const attachments = headerLogoInlineAttachments();
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
        ...(attachments.length > 0 ? { attachments } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Failed to send "${subject}" to ${recipient} (originally: ${to}):`, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Unexpected error sending "${subject}" to ${to}:`, err);
    return false;
  }
}

export async function sendEmailFrom(from: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const apiKey = getResendApiKey();
    const recipient = DEV_EMAIL_OVERRIDE ?? to;
    const devNote =
      DEV_EMAIL_OVERRIDE && DEV_EMAIL_OVERRIDE !== to ? ` [DEV: originally to ${to}]` : "";
    const attachments = headerLogoInlineAttachments();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipient,
        subject: subject + devNote,
        html,
        ...(attachments.length > 0 ? { attachments } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Failed to send "${subject}" to ${recipient} (originally: ${to}):`, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Unexpected error sending "${subject}" to ${to}:`, err);
    return false;
  }
}

export async function sendWaitlistEmailWithFallback(to: string, subject: string, html: string): Promise<boolean> {
  const sentFromWaitlistAddress = await sendEmailFrom(WAITLIST_FROM_ADDRESS, to, subject, html);
  if (sentFromWaitlistAddress) {
    return true;
  }

  console.warn(
    `[email] Waitlist sender failed; retrying from default sender for ${to}`,
  );
  return sendEmail(to, subject, html);
}

export { DEFAULT_PUBLIC_FEEDBACK_EMAIL };

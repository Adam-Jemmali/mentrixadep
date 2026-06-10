/**
 * Email HTML template builders — base layout, detail rows, CTA buttons, styling constants.
 */

import {
  escapeHtml,
  APP_URL,
  headerLogoImgSrc,
  tutorLabel,
  studentLabel,
  durationMinutes,
  formatDurationHuman,
  formatPriceUsd,
  formatDateTime,
  type SessionEmailDetails,
} from "./shared";

const MENTRIXER_LINE =
  'On Mentrixa, learners and Guides are <strong style="color:#e5e5e5;">Mentrixers & Guides</strong>  one community built for depth.';

export function baseTemplate(title: string, bodyContent: string): string {
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
              <img src="${headerLogoImgSrc()}" alt="Mentrixa" width="140" height="32" border="0" style="display:inline-block;height:auto;max-width:140px;vertical-align:middle;border:0;outline:none;text-decoration:none;" />
              <span style="display:inline-block;margin-left:10px;vertical-align:middle;color:#f5f5f5;font-size:16px;font-weight:700;letter-spacing:0.08em;">MENTRIXA</span>
              <p style="margin:12px 0 0;color:#a3a3a3;font-size:12px;line-height:1.5;">
                Real tutors. Top Mentrixers. Live now. Book in 3 minutes.
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

export function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#888;font-size:13px;width:132px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;color:#f5f5f5;font-size:14px;vertical-align:top;font-weight:500;">${value}</td>
  </tr>`;
}

export function ctaButton(
  href: string,
  text: string,
  opts?: { openInNewTab?: boolean },
): string {
  const tabAttrs = opts?.openInNewTab ? ` target="_blank" rel="noopener noreferrer"` : "";
  return `<a href="${href}"${tabAttrs} style="display:inline-block;margin-top:22px;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${escapeHtml(text)}</a>`;
}

export function secondaryLink(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:12px;margin-right:16px;color:#93c5fd;font-size:13px;text-decoration:underline;">${escapeHtml(label)}</a>`;
}

export function starRatingLinks(sessionId: string, tutorDisplayName: string): string {
  const base = `${APP_URL}/student?rateSession=${encodeURIComponent(sessionId)}`;
  const stars = [1, 2, 3, 4, 5].map(
    (n) =>
      `<a href="${base}&stars=${n}" style="display:inline-block;margin:4px 4px 0 0;padding:8px 10px;background:#1a1a1a;border:1px solid #333;border-radius:6px;color:#fbbf24;font-size:16px;text-decoration:none;font-weight:600;" title="Rate ${n} star${n === 1 ? "" : "s"}">${"★".repeat(n)}</a>`
  );
  return `<p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">How was your session with <strong style="color:#e5e5e5;">${escapeHtml(tutorDisplayName)}</strong>?</p><p style="margin:0;">${stars.join("")}</p>`;
}

export function googleCalendarTemplateUrl(params: {
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

export function sessionFactsTable(s: SessionEmailDetails, opts: { includePrice?: boolean; includePartner?: "tutor" | "student" | "both" }): string {
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

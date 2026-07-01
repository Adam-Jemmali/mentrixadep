/**
 * League forum text + link moderation (pure — safe for tests).
 */

const URL_PATTERN =
  /https?:\/\/[^\s<>"'`]+/gi;

const BLOCKED_LINK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "is.gd",
  "ow.ly",
  "buff.ly",
]);

const BLOCKED_LINK_SCHEMES = /^(javascript|data|file|vbscript|blob):/i;

export const DISCUSSION_MAX_LINKS = 3;
export const DISCUSSION_THREAD_TITLE_MAX = 120;
export const DISCUSSION_THREAD_BODY_MAX = 4000;
export const DISCUSSION_REPLY_BODY_MAX = 2000;

export type DiscussionLink = {
  url: string;
  host: string;
};

export function extractDiscussionLinks(text: string): DiscussionLink[] {
  const matches = text.match(URL_PATTERN) ?? [];
  const seen = new Set<string>();
  const links: DiscussionLink[] = [];

  for (const raw of matches) {
    const trimmed = raw.replace(/[),.;!?]+$/g, "");
    if (seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    try {
      const parsed = new URL(trimmed);
      links.push({ url: parsed.href, host: parsed.hostname.toLowerCase() });
    } catch {
      continue;
    }
  }
  return links;
}

function isPrivateIpHost(host: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 192 && (parts[1] ?? 0) === 168) return true;
    if (parts[0] === 172 && (parts[1] ?? 0) >= 16 && (parts[1] ?? 0) <= 31) return true;
  }
  if (host.endsWith(".local")) return true;
  return false;
}

export function validateDiscussionLink(url: string): { ok: true } | { ok: false; reason: string } {
  if (BLOCKED_LINK_SCHEMES.test(url.trim())) {
    return { ok: false, reason: "That link type is not allowed." };
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return { ok: false, reason: "That link is not a valid URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "Only https links are allowed in league discussion." };
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_LINK_HOSTS.has(host) || isPrivateIpHost(host)) {
    return { ok: false, reason: "That link host is not allowed." };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: "Links with embedded credentials are not allowed." };
  }

  return { ok: true };
}

export function validateDiscussionLinks(text: string): { ok: true; links: DiscussionLink[] } | { ok: false; reason: string } {
  const links = extractDiscussionLinks(text);
  if (links.length > DISCUSSION_MAX_LINKS) {
    return {
      ok: false,
      reason: `You can include at most ${DISCUSSION_MAX_LINKS} links per post.`,
    };
  }

  for (const link of links) {
    const result = validateDiscussionLink(link.url);
    if (!result.ok) return result;
  }

  return { ok: true, links };
}

/** Escape HTML then linkify approved https URLs for safe rendering. */
export function renderDiscussionBodyHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return escaped.replace(/https?:\/\/[^\s<>"'`]+/gi, (raw) => {
    const trimmed = raw.replace(/[),.;!?]+$/g, "");
    const suffix = raw.slice(trimmed.length);
    const check = validateDiscussionLink(trimmed);
    if (!check.ok) return raw;
    return `<a href="${trimmed}" target="_blank" rel="noopener noreferrer nofollow" class="text-indigo-600 underline underline-offset-2 hover:text-indigo-800">${trimmed}</a>${suffix}`;
  });
}

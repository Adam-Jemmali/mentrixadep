import { env } from "@/lib/env";

/** Primary public domain when env does not define a reachable origin (e.g. email from dev). */
const EMAIL_ASSET_FALLBACK = "https://mentrixa.one";

/**
 * Canonical site origin for metadata, sitemap, JSON-LD, and absolute URLs.
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_SITE_URL` (trimmed), if set
 * 2. On Vercel: `VERCEL_URL` / `NEXT_PUBLIC_VERCEL_URL` as `https://…`
 * 3. Local dev fallback: `http://localhost:3000`
 *
 * Do not bake `localhost` into `env.public.appUrl` when vars are unset — that would block (2)
 * and break production emails and redirects.
 */
export function getSiteUrl(): string {
  const fromEnv =
    (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() ||
    (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim() ||
    (env.public.appUrl ?? "").trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercelUrl) {
    const host = vercelUrl.replace(/^https?:\/\//i, "").split("/")[0]?.trim();
    if (host) {
      return `https://${host.replace(/\/$/, "")}`;
    }
  }

  return "http://localhost:3000";
}

/**
 * Base URL for links inside transactional email (`<a href>`).
 * Recipients cannot open `localhost`; fall back to the public production host.
 */
export function getEmailAppBaseUrl(): string {
  const site = getSiteUrl().replace(/\/$/, "");
  if (!site.startsWith("http")) {
    return EMAIL_ASSET_FALLBACK;
  }
  try {
    const { hostname } = new URL(site);
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return EMAIL_ASSET_FALLBACK;
    }
    return site;
  } catch {
    return EMAIL_ASSET_FALLBACK;
  }
}

/**
 * Absolute origin for static assets embedded in HTML email (`<img src>`).
 * Inbox clients fetch these without your session cookies; `localhost` and plain HTTP
 * origins are replaced with the production HTTPS host so logos load reliably.
 *
 * Optional override: `NEXT_PUBLIC_EMAIL_ASSET_ORIGIN` (e.g. CDN or primary marketing domain).
 */
export function getEmailPublicAssetOrigin(): string {
  const override = process.env.NEXT_PUBLIC_EMAIL_ASSET_ORIGIN?.trim().replace(/\/$/, "");
  if (override && override.startsWith("https://")) {
    return override;
  }

  const site = getSiteUrl().replace(/\/$/, "");
  if (site.startsWith("https://")) {
    try {
      const { hostname } = new URL(site);
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return EMAIL_ASSET_FALLBACK;
      }
      return site;
    } catch {
      return EMAIL_ASSET_FALLBACK;
    }
  }
  if (
    site.startsWith("http://localhost") ||
    site.startsWith("http://127.0.0.1") ||
    site.startsWith("http://[::1]")
  ) {
    return EMAIL_ASSET_FALLBACK;
  }
  if (site.startsWith("http://")) {
    try {
      const { hostname } = new URL(site);
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return EMAIL_ASSET_FALLBACK;
      }
    } catch {
      return EMAIL_ASSET_FALLBACK;
    }
    return site;
  }
  return EMAIL_ASSET_FALLBACK;
}

export const SITE_NAME = "Mentrixa";

/** Default meta description — keep in sync with root `metadata.description` intent. */
export const SITE_DESCRIPTION =
  "Mentrixa helps students and tutors work smarter with live sessions, structured quests, divisions, and skill progress — serious learning, leveled up.";

import { env } from "@/lib/env";

/**
 * Canonical site origin for metadata, sitemap, JSON-LD, and absolute URLs.
 * Set `NEXT_PUBLIC_SITE_URL` in production if the default should differ.
 */
export function getSiteUrl(): string {
  const fromEnv = env.public.appUrl?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Vercel deployment URL
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}

/**
 * Absolute origin for static assets embedded in HTML email (`<img src>`).
 * Inbox clients fetch these without your session cookies; `localhost` and plain HTTP
 * origins are replaced with the production HTTPS host so logos load reliably.
 *
 * Optional override: `NEXT_PUBLIC_EMAIL_ASSET_ORIGIN` (e.g. CDN or primary marketing domain).
 */
const EMAIL_ASSET_FALLBACK = "https://mentrixa.one";

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

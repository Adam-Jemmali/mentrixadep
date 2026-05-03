import { env } from "@/lib/env";

/** Primary public domain when production email links cannot use the resolved site (e.g. mis-set localhost). */
const EMAIL_ASSET_FALLBACK = "https://mentrixa.one";

/** Outbound email uses public URLs only (never localhost in links/assets). Local dev uses your real `getSiteUrl()` including localhost. */
function isProductionOutboundEmail(): boolean {
  return env.server.nodeEnv === "production";
}

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
 *
 * - **Development / test:** same as `getSiteUrl()` (typically `http://localhost:3000`) so Mailhog
 *   and local flows match your dev server.
 * - **Production:** never `localhost` — uses `getSiteUrl()` when it is already public; otherwise
 *   `NEXT_PUBLIC_EMAIL_APP_URL` or the primary public fallback host.
 */
export function getEmailAppBaseUrl(): string {
  const site = getSiteUrl().replace(/\/$/, "");

  if (!isProductionOutboundEmail()) {
    if (!site.startsWith("http")) return "http://localhost:3000";
    return site;
  }

  if (!site.startsWith("http")) {
    const override = (process.env.NEXT_PUBLIC_EMAIL_APP_URL ?? "").trim().replace(/\/$/, "");
    return override || EMAIL_ASSET_FALLBACK;
  }
  try {
    const { hostname } = new URL(site);
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      const override = (process.env.NEXT_PUBLIC_EMAIL_APP_URL ?? "").trim().replace(/\/$/, "");
      return override || EMAIL_ASSET_FALLBACK;
    }
    return site;
  } catch {
    const override = (process.env.NEXT_PUBLIC_EMAIL_APP_URL ?? "").trim().replace(/\/$/, "");
    return override || EMAIL_ASSET_FALLBACK;
  }
}

/**
 * Absolute origin for static assets embedded in HTML email (`<img src>`).
 *
 * - **Development / test:** same as `getSiteUrl()` so images point at your dev server.
 * - **Production:** never `localhost` for images (inbox clients cannot reach your laptop).
 *   Uses HTTPS site, optional `NEXT_PUBLIC_EMAIL_ASSET_ORIGIN`, then {@link EMAIL_ASSET_FALLBACK}.
 */
export function getEmailPublicAssetOrigin(): string {
  const site = getSiteUrl().replace(/\/$/, "");

  if (!isProductionOutboundEmail()) {
    if (!site.startsWith("http")) return "http://localhost:3000";
    return site;
  }

  const override = process.env.NEXT_PUBLIC_EMAIL_ASSET_ORIGIN?.trim().replace(/\/$/, "");
  if (override && override.startsWith("https://")) {
    return override;
  }

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

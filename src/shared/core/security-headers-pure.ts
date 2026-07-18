/**
 * Pure CSP / Permissions-Policy builders for securityheaders.com A+ (nonce + no bare unsafe script).
 */

export const PERMISSIONS_POLICY =
  "camera=(self), microphone=(self), geolocation=(), interest-cohort=(), payment=()";

export type BuildCspOptions = {
  nonce: string;
  isDev?: boolean;
  /** Defaults to 'none'. Use * for embeddable widget/auth entry paths. */
  frameAncestors?: string;
};

/** Cryptographically random nonce for one request (Edge + Node). */
export function createCspNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Production script-src: nonce + strict-dynamic (no unsafe-inline / unsafe-eval).
 * Dev keeps unsafe-eval for React refresh. Host allowlists remain as fallback for older browsers.
 */
export function buildContentSecurityPolicy(opts: BuildCspOptions): string {
  const { nonce, isDev = false, frameAncestors = "'none'" } = opts;
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://www.gstatic.com",
    "https://js.stripe.com",
    "https://*.stripe.com",
  ].join(" ");

  return [
    "default-src 'self'",
    "upgrade-insecure-requests",
    `script-src ${scriptSrc}`,
    "script-src-attr 'none'",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://accounts.google.com https://fonts.googleapis.com https://www.gstatic.com",
    "img-src 'self' blob: data: https: https://*.googleusercontent.com https://*.stripe.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "object-src 'none'",
    "frame-src 'self' https://accounts.google.com https://js.stripe.com https://*.stripe.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://www.googleapis.com https://www.gstatic.com https://api.stripe.com https://*.stripe.com",
    "media-src 'self' blob:",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/** Public JSON feeds that intentionally allow cross-origin reads (embed widgets). */
export function isPublicCorsFeedPath(pathname: string | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === "/api/public/arena-feed" ||
    pathname.startsWith("/api/public/guide-feed/")
  );
}

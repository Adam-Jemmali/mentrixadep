/**
 * Canonical site origin for metadata, sitemap, JSON-LD, and absolute URLs.
 * Set `NEXT_PUBLIC_SITE_URL` in production if the default should differ.
 */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "https://mentrixa.one";
}

export const SITE_NAME = "Mentrixa";

/** Default meta description — keep in sync with root `metadata.description` intent. */
export const SITE_DESCRIPTION =
  "Mentrixa helps students and tutors work smarter with live sessions, structured quests, divisions, and skill progress — serious learning, leveled up.";

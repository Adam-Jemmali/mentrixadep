import { env } from "@/lib/env";

/**
 * Canonical site origin for metadata, sitemap, JSON-LD, and absolute URLs.
 * Set `NEXT_PUBLIC_SITE_URL` in production if the default should differ.
 */
export function getSiteUrl(): string {
  const fromEnv = env.public.appUrl?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}

export const SITE_NAME = "Mentrixa";

/** Default meta description — keep in sync with root `metadata.description` intent. */
export const SITE_DESCRIPTION =
  "Mentrixa helps students and tutors work smarter with live sessions, structured quests, divisions, and skill progress — serious learning, leveled up.";

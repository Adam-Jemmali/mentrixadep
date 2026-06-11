/** Classify inbound referrer for rank_card_viewed analytics. */
export function parseReferrerSource(referrer: string | null | undefined): string {
  if (!referrer?.trim()) return "direct";

  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("linkedin")) return "linkedin";
    if (host.includes("twitter") || host === "x.com" || host.endsWith(".x.com")) return "twitter";
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("reddit")) return "reddit";
    if (host.includes("google")) return "google";
    if (host.includes("mentrixa")) return "mentrixa";
    return host.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

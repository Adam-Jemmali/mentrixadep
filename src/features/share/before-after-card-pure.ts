/** Before and after proof card copy and formatters. Brief. No middots. */

export const PROOF_CARD_COPY = {
  beforeLabel: "Before",
  afterLabel: "After",
  withGuide: (name: string) => `with ${name.trim() || "your Guide"}`,
  shareCta: "Share",
  wordmark: "MENTRIXA",
} as const;

export function formatProofAccuracy(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatProofDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatProofRankFootprint(username: string | null | undefined): string | null {
  const handle = username?.trim();
  if (!handle) return null;
  return `mentrixa.one/rank/${handle}`;
}

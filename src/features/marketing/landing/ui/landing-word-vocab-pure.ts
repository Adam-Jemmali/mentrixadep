import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

/** Single-word landing labels → public vocab sticker icons. */
export const LANDING_WORD_VOCAB: Record<string, VocabIconName> = {
  Book: "flow-book",
  Breakthrough: "breakthrough",
  Climb: "flow-climb",
  Duel: "duels",
  Feed: "leaderboard",
  Hub: "home",
  Impact: "impact-score",
  Lock: "verified",
  tools: "session",
  steps: "quest",
  roles: "identity",
  tiers: "rank-proof",
  signals: "verified",
  Loop: "loop-report",
  Meet: "flow-meet",
  Order: "quest",
  Pack: "practice-pack",
  Passport: "passport",
  Path: "identity",
  Play: "duels",
  Profile: "profile",
  Proof: "verified",
  Quest: "quest",
  Rank: "rank-proof",
  Ranks: "rank-proof",
  Role: "guide",
  Schedule: "booking",
  Session: "session",
  Start: "quest",
  Stripe: "receipt",
  Studio: "bento-guide-studio",
  Unpack: "flow-unpack",
  Watch: "arena",
};

export function landingWordVocabIcon(word: string): VocabIconName {
  const trimmed = word.trim();
  return LANDING_WORD_VOCAB[trimmed] ?? LANDING_WORD_VOCAB[trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()] ?? "verified";
}

export function isSingleWordLabel(text: string): boolean {
  return text.trim().split(/\s+/).filter(Boolean).length === 1;
}

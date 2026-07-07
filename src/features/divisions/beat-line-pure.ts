import type { TopRivalData } from "@/features/divisions/top-rival";

export const BEAT_LINE_CATEGORY = "Beat Line";
export const BEAT_LINE_SUMMARY = "One rival above you. One XP gap. One move.";

export type BeatLineView = {
  verdict: string;
  ctaLabel: string;
  ctaHref: string;
};

function firstName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "them";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function buildBeatLineView(data: TopRivalData): BeatLineView | null {
  if (data.status === "no_division") return null;

  const ctaLane = data.ctaLane ?? (data.status === "rank_1" ? "duel" : "quest");
  const ctaHref = ctaLane === "duel" ? "/student/duel" : "/student/quest";

  if (data.status === "rank_1") {
    return {
      verdict: "You hold the Beat Line. Defend in Duels.",
      ctaLabel: "Defend in Duels",
      ctaHref,
    };
  }

  const rival = firstName(data.rivalName ?? "Rival");
  const gap = data.xpGap ?? 0;

  return {
    verdict: `${rival} is ${gap} XP ahead. Pass them in Quest.`,
    ctaLabel: `Beat ${rival} in Quest`,
    ctaHref,
  };
}

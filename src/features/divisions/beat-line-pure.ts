import type { TopRivalData } from "@/features/divisions/top-rival";
import type { MomentumValueChips } from "@/features/momentum-hub/momentum-value-equation-pure";

/** Shared Arena + Momentum social layer: one real person directly above you on the league board. */
export const BEAT_LINE_CATEGORY = "The Beat Line";
export const BEAT_LINE_SUMMARY =
  "One real rival on the league board. Not a bot. Not a crowd. One person, one XP gap, one move to pass them.";

export type BeatLineView = {
  verdict: string;
  nextAction: string;
  ctaLabel: string;
  ctaHref: string;
  chips: MomentumValueChips;
};

function firstName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "them";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function questMinutesFromGap(xpGap: number): number {
  return Math.max(5, Math.min(15, Math.ceil(xpGap / 12)));
}

export function buildBeatLineView(data: TopRivalData): BeatLineView | null {
  if (data.status === "no_division") return null;

  const ctaLane = data.ctaLane ?? (data.status === "rank_1" ? "duel" : "quest");
  const ctaHref = ctaLane === "duel" ? "/student/duel" : "/student/quest";

  if (data.status === "rank_1") {
    return {
      verdict: "You hold the Beat Line. Everyone below you is chasing your league XP.",
      nextAction: "Queue a Duel before someone closes the gap.",
      ctaLabel: "Defend in Duels",
      ctaHref,
      chips: {
        dreamOutcome: "Stay #1 on the AP Calc AB league board this week",
        perceivedLikelihood: "You already lead — one win widens the gap",
        timeDelay: "Next duel queue opens now",
        effort: "1 tap — enter the duel lobby",
      },
    };
  }

  const rival = firstName(data.rivalName ?? "Rival");
  const gap = data.xpGap ?? 0;
  const minutes = questMinutesFromGap(gap);

  return {
    verdict: `${rival} is the Beat Line — ${gap} XP ahead of you on the league board.`,
    nextAction: `One Quest run can close the gap. Then challenge them in Duels.`,
    ctaLabel: `Beat ${rival} in Quest`,
    ctaHref,
    chips: {
      dreamOutcome: `Pass ${rival} and flip league rank #${data.myRank} → #${Math.max(1, (data.myRank ?? 2) - 1)}`,
      perceivedLikelihood: `${gap} XP gap — league XP only moves on Quest and Duel wins`,
      timeDelay: `~${minutes} min in Quest`,
      effort: "1 tap — Quest opens on your lane",
    },
  };
}

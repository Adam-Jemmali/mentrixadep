import type { BeatLineView } from "@/features/divisions/beat-line-pure";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";

export type StudentHubDoNext = {
  verdict: string;
  ctaLabel: string;
  ctaHref: string;
  mode: "defend" | "chase";
  categoryIcon: VocabIconName;
  ctaIcon: VocabIconName;
  lines: Array<{ icon: VocabIconName; text: string }>;
};

export function pickStudentHubDoNext(input: {
  beatLine: BeatLineView | null;
}): StudentHubDoNext | null {
  if (input.beatLine) {
    return {
      verdict: input.beatLine.verdict,
      ctaLabel: input.beatLine.ctaLabel,
      ctaHref: input.beatLine.ctaHref,
      mode: input.beatLine.mode,
      categoryIcon: input.beatLine.categoryIcon,
      ctaIcon: input.beatLine.ctaIcon,
      lines: input.beatLine.lines,
    };
  }
  return null;
}

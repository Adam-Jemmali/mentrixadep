import type { BeatLineView } from "@/features/divisions/beat-line-pure";

export type StudentHubDoNext = {
  verdict: string;
  ctaLabel: string;
  ctaHref: string;
};

export function pickStudentHubDoNext(input: {
  beatLine: BeatLineView | null;
}): StudentHubDoNext | null {
  if (input.beatLine) {
    return {
      verdict: input.beatLine.verdict,
      ctaLabel: input.beatLine.ctaLabel,
      ctaHref: input.beatLine.ctaHref,
    };
  }
  return null;
}

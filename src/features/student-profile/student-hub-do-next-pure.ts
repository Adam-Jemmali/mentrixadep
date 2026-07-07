import type { BeatLineView } from "@/features/divisions/beat-line-pure";
import type { ActionQueueItem } from "@/features/momentum-hub/momentum-action-queue-pure";
import type { MomentumPlaybook } from "@/features/momentum-hub/momentum-value-equation-pure";

export type StudentHubDoNext = {
  verdict: string;
  ctaLabel: string;
  ctaHref: string;
};

export function pickStudentHubDoNext(input: {
  playbook: MomentumPlaybook | null;
  queueItems: ActionQueueItem[];
  beatLine: BeatLineView | null;
}): StudentHubDoNext | null {
  if (input.playbook) {
    const { primary } = input.playbook;
    return { verdict: primary.verdict, ctaLabel: primary.label, ctaHref: primary.href };
  }
  const first = input.queueItems[0];
  if (first) {
    return { verdict: first.headline, ctaLabel: first.ctaLabel, ctaHref: first.ctaHref };
  }
  if (input.beatLine) {
    return {
      verdict: input.beatLine.verdict,
      ctaLabel: input.beatLine.ctaLabel,
      ctaHref: input.beatLine.ctaHref,
    };
  }
  return null;
}

export function pickStudentHubMoreSteps(
  queueItems: ActionQueueItem[],
  hasPlaybook: boolean,
): ActionQueueItem[] {
  if (hasPlaybook) return queueItems.slice(0, 2);
  return queueItems.slice(1, 3);
}

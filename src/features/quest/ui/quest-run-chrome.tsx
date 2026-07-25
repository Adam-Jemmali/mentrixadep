"use client";

import { MasteryNode } from "@/components/mastery-node";
import type { MasteryNodeVisualState } from "@/components/mastery-node";
import { MasteryGridLegend } from "@/features/mastery-grid/ui/mastery-grid-legend";
import { QuestAnimatedProgressBar } from "@/features/quest/ui/quest-animated-progress-bar";
import { QuestTimerProgressCircle } from "@/shared/ui/progress-circle-patterns";
import { MentrixaVocabIcon, VOCAB_HEADING_ICON_SIZE } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_QUEST_ICON } from "@/shared/icons/vocab-canonical";

export function QuestRunChrome({
  questionIndex,
  questionTotal,
  progressPercent,
  timeLeftSec,
  timeLimitSec,
  skillNodeName,
  nodeVisualState,
}: {
  questionIndex: number;
  questionTotal: number;
  progressPercent: number;
  timeLeftSec: number;
  timeLimitSec: number;
  skillNodeName?: string;
  nodeVisualState?: MasteryNodeVisualState;
}) {
  return (
    <div className="quest-header mb-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MentrixaVocabIcon
            name={CANONICAL_QUEST_ICON}
            size={VOCAB_HEADING_ICON_SIZE * 0.55}
            surface="dark"
            title="Quest question"
          />
          <p className="font-mono text-xs font-bold tabular-nums text-white/70">
            Q{questionIndex + 1}/{questionTotal || "…"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {skillNodeName && nodeVisualState ? (
            <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[var(--mx-navy-2)] px-2 py-1">
              <MasteryNode
                nodeId={`quest-${skillNodeName}`}
                state={nodeVisualState}
                nodeName={skillNodeName}
                size="xs"
                showGlow={nodeVisualState === "verified"}
              />
              <span className="max-w-[8rem] truncate text-[10px] font-semibold uppercase tracking-wide text-white/75">
                {skillNodeName}
              </span>
            </div>
          ) : null}
          <QuestTimerProgressCircle timeLeftSec={timeLeftSec} timeLimitSec={timeLimitSec} />
        </div>
      </div>
      <QuestAnimatedProgressBar value={progressPercent} />
      <MasteryGridLegend surface="dark" compact className="border-t border-white/10 pt-3" />
    </div>
  );
}

export function QuestRunLoadingState({ message, error }: { message: string; error?: string | null }) {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 py-10">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--mx-primary)] border-t-transparent motion-reduce:animate-none"
        aria-hidden
      />
      <p className="text-sm text-white/70">{message}</p>
      {error ? <p className="text-sm font-medium text-red-300">{error}</p> : null}
    </div>
  );
}

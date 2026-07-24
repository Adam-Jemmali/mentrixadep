"use client";

import { MasteryNode } from "@/components/mastery-node";
import type { MasteryNodeVisualState } from "@/components/mastery-node";
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
            surface="light"
            title="Quest question"
          />
          <p className="font-mono text-xs font-bold tabular-nums text-[#475569]">
            Q{questionIndex + 1}/{questionTotal || "…"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {skillNodeName && nodeVisualState ? (
            <div className="flex items-center gap-2 rounded-lg border border-violet-300 bg-white/90 px-2 py-1 shadow-sm">
              <MasteryNode
                nodeId={`quest-${skillNodeName}`}
                state={nodeVisualState}
                nodeName={skillNodeName}
                size="xs"
                showGlow={nodeVisualState === "verified"}
              />
              <span className="max-w-[8rem] truncate text-[10px] font-semibold uppercase tracking-wide text-[#475569]">
                {skillNodeName}
              </span>
            </div>
          ) : null}
          <QuestTimerProgressCircle timeLeftSec={timeLeftSec} timeLimitSec={timeLimitSec} />
        </div>
      </div>
      <QuestAnimatedProgressBar value={progressPercent} />
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
      <p className="text-sm text-[#475569]">{message}</p>
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

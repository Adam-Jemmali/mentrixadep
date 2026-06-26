"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { MentrixaDrawer } from "@/shared/ui/drawer-patterns";
import { VerifiedFirstAttemptAlert } from "@/shared/ui/alert-patterns";
import { ExamStakesLabel } from "@/shared/ui/tooltip-patterns";
import { ApCalcSkillGlyph } from "@/features/quest/ui/ap-calc-skill-glyph";
import { QuestSessionProgressBar } from "@/shared/ui/progress-bar-patterns";
import { QuestTimerProgressCircle } from "@/shared/ui/progress-circle-patterns";
import { questToolsDrawerMessage } from "@/shared/ui/drawer-messages-pure";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";

export function QuestPracticeToolsDrawer({
  questionIndex,
  questionTotal,
  timeLeftSec,
  timeLimitSec,
  subtopicTag,
  examStakes,
}: {
  questionIndex: number;
  questionTotal: number;
  timeLeftSec: number;
  timeLimitSec: number;
  subtopicTag?: string;
  examStakes?: string;
}) {
  const [open, setOpen] = useState(false);
  const progress = questionTotal > 0 ? ((questionIndex + 1) / questionTotal) * 100 : 0;
  const copy = questToolsDrawerMessage();

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="workbenchPrimary"
        className="fixed bottom-4 right-4 z-40 shadow-lg md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open quest tools"
      >
        Quest tools
      </Button>

      <MentrixaDrawer
        isOpen={open}
        onOpenChange={setOpen}
        placement="bottom"
        tone="light"
        brandKind="mentrixer"
        title={copy.title}
        description={copy.description}
        bodyClassName="space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs font-mono ${mentrixStudent.textMutedOnLight}`}>
            Q{questionIndex + 1}/{questionTotal}
          </p>
          <QuestTimerProgressCircle timeLeftSec={timeLeftSec} timeLimitSec={timeLimitSec} />
        </div>
        <QuestSessionProgressBar value={progress} />
        <VerifiedFirstAttemptAlert kind="practice_pack" subjectLabel={AP_CALC_AB_SUBJECT} />
        {subtopicTag || examStakes ? (
          <div className="flex flex-wrap items-center gap-3">
            {subtopicTag ? (
              <div className="flex items-center gap-2.5">
                <ApCalcSkillGlyph nodeName={subtopicTag} size="sm" />
                <span className="text-xs font-semibold text-slate-700">{subtopicTag}</span>
              </div>
            ) : null}
            {examStakes ? <ExamStakesLabel examStakes={examStakes} tone="light" /> : null}
          </div>
        ) : null}
        <p className={`text-sm leading-relaxed ${mentrixStudent.textMutedOnLight}`}>
          {copy.verdict} {copy.nextAction}
        </p>
      </MentrixaDrawer>
    </>
  );
}

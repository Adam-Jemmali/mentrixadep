"use client";

import { Button } from "@/shared/ui/button";
import { VerifiedFirstAttemptDisclosure } from "@/shared/ui/disclosure-patterns";
import { QuestPackLoadPendingPanel } from "@/shared/ui/spinner-patterns";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import type { PracticeDifficulty } from "@/features/quest/practice-quest-types";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import { STUDENT_ROUTE_HEADER_VARIANT } from "@/features/student-profile/student-sticky-variants";
import { MentrixaVocabIcon, VocabSectionHeading, VOCAB_HEADING_ICON_SIZE } from "@/shared/icons/mentrixa-vocab-icons";
import { PracticeLockedAttemptAlert, isPracticeLockedAttemptError } from "@/shared/ui/alert-patterns";

export const QUEST_PRACTICE_DIFFICULTIES: { value: PracticeDifficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function practiceDifficultyLabel(difficulty: PracticeDifficulty): string {
  return QUEST_PRACTICE_DIFFICULTIES.find((entry) => entry.value === difficulty)?.label ?? difficulty;
}

type QuestPracticePackWizardProps = {
  busy: boolean;
  err: string | null;
  difficulty: PracticeDifficulty;
  onDifficultyChange: (difficulty: PracticeDifficulty) => void;
  onStart: () => void;
  startLabel?: string;
  showVerifiedDisclosure?: boolean;
  heading?: string;
  subtitle?: string | null;
};

export function QuestPracticePackWizard({
  busy,
  err,
  difficulty,
  onDifficultyChange,
  onStart,
  startLabel = "Start verified pack",
  showVerifiedDisclosure = true,
  heading = "Verified practice pack",
  subtitle = null,
}: QuestPracticePackWizardProps) {
  return (
    <div className="relative w-full">
      {busy ? (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-[#FAFAF8]/92 px-8 backdrop-blur-sm"
          aria-busy="true"
          aria-live="polite"
        >
          <QuestPackLoadPendingPanel className="max-w-xs" />
        </div>
      ) : null}
      <StudentStickyNote variant={STUDENT_ROUTE_HEADER_VARIANT.quest} className="space-y-6">
        <VocabSectionHeading
          name="quest"
          label="Practice packs"
          surface="light"
          labelClassName="mx-hub-type-ui text-[#6366F1]"
          className="block w-full"
        />
        <h1 className={`flex items-center gap-4 ${mentrixStudent.cardTitle}`}>
          <MentrixaVocabIcon name="verified" size={VOCAB_HEADING_ICON_SIZE} gold surface="light" title="Verified" />
          <span>{heading}</span>
        </h1>
        {subtitle ? (
          <p className={`mt-2 text-sm leading-relaxed ${mentrixStudent.textMutedOnDark}`}>{subtitle}</p>
        ) : null}

        {showVerifiedDisclosure ? (
          <div className="mt-4">
            <VerifiedFirstAttemptDisclosure subjectLabel={AP_CALC_AB_SUBJECT} tone="light" />
          </div>
        ) : null}

        <div className="mt-8 space-y-6">
          <div>
            <label className={`text-xs font-medium ${mentrixStudent.textMutedOnDark}`}>Subject</label>
            <p className="mt-2 rounded-xl border border-[#A5B4FC] bg-white px-4 py-3 text-sm font-semibold text-[#0B1220]">
              {AP_CALC_AB_SUBJECT}
            </p>
          </div>

          <div>
            <label className={`text-xs font-medium ${mentrixStudent.textMutedOnDark}`}>Difficulty</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUEST_PRACTICE_DIFFICULTIES.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => onDifficultyChange(entry.value)}
                  className={
                    difficulty === entry.value ? mentrixStudent.chipActive : mentrixStudent.chipIdle
                  }
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {err ? (
            isPracticeLockedAttemptError(err) ? (
              <PracticeLockedAttemptAlert />
            ) : (
              <p className="text-sm font-medium text-red-600">{err}</p>
            )
          ) : null}

          <Button className="w-full" variant="workbenchPrimary" disabled={busy} onClick={onStart}>
            {busy ? "Loading pack…" : startLabel}
          </Button>
        </div>
      </StudentStickyNote>
    </div>
  );
}

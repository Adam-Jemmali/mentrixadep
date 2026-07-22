"use client";

import Link from "next/link";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { motion } from "@/shared/animation/motion";
import { StudentHomeAnimatedSticky } from "@/features/student-home/student-home-animated-sticky";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import {
  StudentHubNumericReveal,
  StudentHubNumericStat,
} from "@/features/student-home/student-hub-numeric-panel";
import { landingStickyVariantForIndex } from "@/features/student-profile/student-sticky-variants";
import type { StudentStickyVariant } from "@/features/student-profile/student-sticky-variants";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import {
  buildMasteryGridNextAction,
  pickWeakestMasteryNodes,
  summarizeMasteryGrid,
} from "@/features/mastery-grid/mastery-grid-pure";
import { SkillNodeStrengthMeter } from "@/shared/ui/meter-patterns";
import { XpTierProgressBar } from "@/shared/ui/progress-bar-patterns";
import { AbCalculusSubjectTitle } from "@/features/quest/ui/ab-calc-subject-title";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import {
  MentrixaVocabIcon,
  VocabSectionHeading,
} from "@/shared/icons/mentrixa-vocab-icons";

export function MasteryGridHubCard({
  data,
  compact = false,
  stickyVariant = "taped",
  className,
  staggerIndex,
}: {
  data: MasteryGridData;
  compact?: boolean;
  stickyVariant?: StudentStickyVariant;
  className?: string;
  staggerIndex?: number;
}) {
  const summary = summarizeMasteryGrid(data);
  const weakest = pickWeakestMasteryNodes(data, compact ? 1 : 3);
  const nextAction = buildMasteryGridNextAction(data.units);

  const body = (
    <section aria-label="Skill tree summary">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <VocabSectionHeading
            name="mastery-grid"
            label="Grid"
            surface="light"
            iconSize={compact ? 36 : undefined}
            labelClassName="text-[#0891B2]"
          />
          <div className="mt-1">
            <AbCalculusSubjectTitle hubPaper className={compact ? "text-sm sm:text-base" : undefined} />
          </div>
          <StudentHubNumericReveal className="mt-3 grid gap-2 sm:grid-cols-3">
            <StudentHubNumericStat
              className="rotate-0 px-2 py-2"
              variant={landingStickyVariantForIndex(0)}
              compact
              watermark={summary.verifiedCount}
              icon="verified"
              label="Verified first tries"
              numericEnd={summary.verifiedCount}
              detail={`${AP_CALC_AB_SUBJECT} skills with a locked first answer. Updates when you finish a new first try.`}
              gold={summary.verifiedCount > 0}
            />
            <StudentHubNumericStat
              className="rotate-[0.2deg] px-2 py-2"
              variant={landingStickyVariantForIndex(1)}
              compact
              watermark={summary.proficientCount}
              icon="practice-pack"
              label="Practice at 70%+"
              numericEnd={summary.proficientCount}
              detail="Skills solid in practice reps only. Not verified yet. Zero means none crossed 70% in practice."
            />
            <StudentHubNumericStat
              className="rotate-0 px-2 py-2"
              variant={landingStickyVariantForIndex(2)}
              compact
              watermark={summary.totalNodes}
              icon="skills"
              label="Skills in tree"
              numericEnd={summary.totalNodes}
              detail={`Total ${AP_CALC_AB_SUBJECT} skills on the mastery grid.`}
            />
          </StudentHubNumericReveal>
        </div>
        <Link href="/student/mastery" className={mentrixStudent.hubBtn} title="Open skills">
          <MentrixaVocabIcon name="skills" size={compact ? 24 : 28} surface="dark" title="Skills" />
          <span className="text-[9px] font-black uppercase tracking-[0.12em]">Skills</span>
        </Link>
      </div>

      {!compact ? (
        <div className="mt-4">
          <XpTierProgressBar
            value={summary.progressPercent}
            tone="light"
            fillStyle={{ background: "#6366F1" }}
          />
        </div>
      ) : null}

      {weakest.length > 0 ? (
        <div className={compact ? "mt-3 space-y-2" : "mt-4 space-y-2"}>
          <p className="inline-flex items-center gap-2 rounded-md bg-amber-300 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-950">
            <MentrixaVocabIcon name="focus-ring" size={compact ? 16 : 20} surface="light" title="Weakest" />
            Weakest
          </p>
          {weakest.map((node) => {
            const unitNumber = data.units.find((unit) =>
              unit.nodes.some((entry) => entry.id === node.id),
            )?.unitNumber;

            return (
              <SkillNodeStrengthMeter
                key={node.id}
                nodeName={node.nodeName}
                nodeSlug={node.nodeSlug}
                unitNumber={unitNumber}
                state={node.state}
                accuracyPercent={node.accuracyPercent}
                tone="light"
              />
            );
          })}
        </div>
      ) : null}

      {!compact ? <p className="mt-4 text-xs font-medium text-[#475569]">{nextAction}</p> : null}
    </section>
  );

  if (staggerIndex != null) {
    return (
      <StudentHomeAnimatedSticky
        variant={stickyVariant}
        className={cn("h-full", className)}
        staggerIndex={staggerIndex}
      >
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: staggerIndex * 0.12 + 0.22, duration: 0.45 }}
        >
          {body}
        </motion.div>
      </StudentHomeAnimatedSticky>
    );
  }

  return (
    <StudentStickyNote variant={stickyVariant} className={cn("h-full", className)}>
      {body}
    </StudentStickyNote>
  );
}

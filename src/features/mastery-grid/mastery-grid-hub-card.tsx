"use client";

import Link from "next/link";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
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
import {
  MasteryGridSummaryMetrics,
  MentrixaVocabIcon,
  VocabSectionHeading,
} from "@/shared/icons/mentrixa-vocab-icons";

export function MasteryGridHubCard({
  data,
  compact = false,
  stickyVariant = "taped",
}: {
  data: MasteryGridData;
  compact?: boolean;
  stickyVariant?: StudentStickyVariant;
}) {
  const summary = summarizeMasteryGrid(data);
  const weakest = pickWeakestMasteryNodes(data, compact ? 1 : 3);
  const nextAction = buildMasteryGridNextAction(data.units);

  return (
    <StudentStickyNote variant={stickyVariant} className="h-full">
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
          <MasteryGridSummaryMetrics
            className="mt-2"
            verifiedCount={summary.verifiedCount}
            proficientCount={summary.proficientCount}
            totalNodes={summary.totalNodes}
            surface="light"
          />
        </div>
        <Link href="/student/mastery" className={mentrixStudent.hubBtn} title="Open skill tree">
          <MentrixaVocabIcon name="skills" size={compact ? 24 : 28} surface="dark" title="Skills" />
          <span className="text-[9px] font-black uppercase tracking-[0.12em]">Tree</span>
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
          <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#4F46E5]">
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
    </StudentStickyNote>
  );
}

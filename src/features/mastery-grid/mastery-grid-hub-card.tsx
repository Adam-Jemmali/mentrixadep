"use client";

import Link from "next/link";
import { mentrixStudent, mentrixProfileType } from "@/features/student-profile/mentrix-student-ui";
import type { MasteryGridData } from "@/features/mastery-grid/types";
import {
  buildMasteryGridNextAction,
  pickWeakestMasteryNodes,
  summarizeMasteryGrid,
} from "@/features/mastery-grid/mastery-grid-pure";
import { SkillNodeStrengthMeter } from "@/shared/ui/meter-patterns";
import { XpTierProgressBar } from "@/shared/ui/progress-bar-patterns";
import {
  MasteryGridSummaryMetrics,
  MentrixaVocabIcon,
} from "@/shared/icons/mentrixa-vocab-icons";

export function MasteryGridHubCard({ data }: { data: MasteryGridData }) {
  const summary = summarizeMasteryGrid(data);
  const weakest = pickWeakestMasteryNodes(data, 3);
  const nextAction = buildMasteryGridNextAction(data.units);

  return (
    <section className={`${mentrixStudent.cardArena} p-5 sm:p-6`} aria-label="Skill tree summary">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={`${mentrixProfileType.statLabelOnDark} inline-flex items-center gap-2`}>
            <MentrixaVocabIcon name="mastery-grid" size={20} surface="dark" title="Mastery Grid" />
            Grid
          </p>
          <p className="mt-1 text-sm font-medium italic text-violet-100/90">{data.subject}</p>
          <MasteryGridSummaryMetrics
            className="mt-3"
            verifiedCount={summary.verifiedCount}
            proficientCount={summary.proficientCount}
            totalNodes={summary.totalNodes}
            surface="dark"
          />
        </div>
        <Link
          href="/student/mastery"
          className={mentrixProfileType.ctaPrimary}
        >
          Open skill tree
        </Link>
      </div>

      <div className="mt-4">
        <XpTierProgressBar
          value={summary.progressPercent}
          tone="dark"
          fillStyle={{
            background: "linear-gradient(90deg, #6366F199, #7C3AED)",
          }}
        />
      
      </div>

      {weakest.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className={mentrixProfileType.labelOnDark}>Weakest right now</p>
          {weakest.map((node) => (
            <SkillNodeStrengthMeter
              key={node.id}
              nodeName={node.nodeName}
              state={node.state}
              accuracyPercent={node.accuracyPercent}
              tone="dark"
            />
          ))}
        </div>
      ) : null}

      <p className={`mt-4 ${mentrixProfileType.bodyOnDark}`}>{nextAction}</p>
    </section>
  );
}

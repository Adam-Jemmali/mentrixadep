"use client";

import { GuideStickyNote } from "@/features/tutor/ui/guide-sticky-note";
import { GUIDE_SECTION_STICKY_VARIANT } from "@/features/tutor/guide-sticky-variants";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { VerdictPanel } from "@/features/guidance/verdict-panel";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { GUIDE_WEEKLY_IMPACT } from "@/features/tutor/guide-home-copy-pure";
import type { GuideWeeklyNodeImpact } from "@/features/tutor/command-center-weekly-impact-pure";

export function GuideWeeklyImpactPanel({
  nodes,
}: {
  nodes: GuideWeeklyNodeImpact[];
}) {
  return (
    <section className="mb-8">
      <GuideStickyNote variant={GUIDE_SECTION_STICKY_VARIANT.impact}>
        <h2 className={`mb-1 flex items-center gap-2 text-sm font-bold ${mentrixStudent.textOnLight}`}>
          <MentrixaVocabIcon name="impact-score" size={16} gold surface="light" title="Guide Impact" />
          {GUIDE_WEEKLY_IMPACT.title}
        </h2>
        <p className={`mb-4 text-xs ${mentrixStudent.textMutedOnLight}`}>{GUIDE_WEEKLY_IMPACT.subtitle}</p>
        {nodes.length === 0 ? (
          <p className={`text-sm ${mentrixStudent.textMutedOnLight}`}>{GUIDE_WEEKLY_IMPACT.empty}</p>
        ) : (
          <ul className="space-y-4">
            {nodes.map((row) => (
              <li key={row.skillNodeId} className="rounded-xl border border-violet-100 bg-zinc-50/50 p-4">
                <p className={`mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-600`}>
                  {row.nodeName}
                </p>
                <VerdictPanel verdict={row.verdict} tone="light" />
              </li>
            ))}
          </ul>
        )}
      </GuideStickyNote>
    </section>
  );
}

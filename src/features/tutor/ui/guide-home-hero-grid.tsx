"use client";

import Link from "next/link";
import { motion } from "@/shared/animation/motion";
import { MasteryNode } from "@/components/mastery-node";
import type { TutorCommandCenterPayload } from "@/features/tutor/command-center";
import { GuideAnimatedSticky } from "@/features/tutor/ui/guide-animated-sticky";
import { GuideBrowseImpactChips } from "@/features/guide-impact/components/guide-browse-impact-chips";
import { GuideImpactProgressRing } from "@/features/tutor/ui/guide-impact-progress-ring";
import { VerdictPanel } from "@/features/guidance/verdict-panel";
import { Card, CardContent } from "@/shared/ui/card";
import { formatTimeInZone, formatDateInZone } from "@/shared/core/time-format";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  CANONICAL_IMPACT_SCORE_ICON,
  CANONICAL_SESSION_ICON,
  CANONICAL_SKILLS_ICON,
} from "@/shared/icons/vocab-canonical";
import { GUIDE_SECTION_STICKY_VARIANT } from "@/features/tutor/guide-sticky-variants";
import { GUIDE_HOME, GUIDE_DEMAND } from "@/features/tutor/guide-home-copy-pure";
import {
  guideImpactHeroTone,
  studentDisplayNameFromSession,
  toTopImpactChips,
} from "@/features/tutor/guide-home-pure";
import { maxImpactScore } from "@/features/guide-rank/calculate-pure";
import { cn } from "@/shared/core/utils";

const demandListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const demandRowVariants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function GuideHomeHeroGrid({
  data,
  onOpenAvailability,
  onSetAvailability,
}: {
  data: TutorCommandCenterPayload;
  onOpenAvailability: (subject: string) => void;
  onSetAvailability: () => void;
}) {
  const impactScore = maxImpactScore(data.impactScores);
  const impactTone = guideImpactHeroTone(impactScore);
  const upcoming = data.upcomingSessions.slice(0, 3);

  return (
    <div className="mb-4 grid gap-3 lg:grid-cols-3 lg:items-stretch">
      <GuideAnimatedSticky variant={GUIDE_SECTION_STICKY_VARIANT.home} staggerIndex={0}>
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#7C3AED]">
          {GUIDE_DEMAND.title}
        </p>
        {data.demandSignals.length === 0 ? (
          <p className="mt-2 text-sm font-medium text-[#475569]">{GUIDE_HOME.demandEmpty}</p>
        ) : (
          <motion.ul
            className="mt-2 space-y-1.5"
            variants={demandListVariants}
            initial="hidden"
            animate="show"
          >
            {data.demandSignals.slice(0, 3).map((signal) => (
              <motion.li
                key={signal.skillNodeId}
                variants={demandRowVariants}
                className="flex items-center gap-2 rounded-lg border border-[#E0E7FF] bg-white/80 px-2 py-1.5"
              >
                <MasteryNode
                  nodeId={signal.skillNodeId}
                  state="attempted"
                  nodeName={signal.nodeName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#0B1220]">{signal.nodeName}</p>
                  <p className="flex items-center gap-1 text-[10px] text-[#475569]">
                    <MentrixaVocabIcon name={CANONICAL_SKILLS_ICON} size={12} surface="light" title="Students" />
                    {signal.weakStudentCount} student{signal.weakStudentCount === 1 ? "" : "s"}
                  </p>
                </div>
                {!signal.hasOpenAvailability ? (
                  <button
                    type="button"
                    onClick={() => onOpenAvailability(signal.subject)}
                    className={cn(
                      mentrixStudent.hubGhostLink,
                      "shrink-0 cursor-pointer px-2 py-1 text-[10px] font-bold",
                    )}
                  >
                    + Open a slot
                  </button>
                ) : null}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </GuideAnimatedSticky>

      <GuideAnimatedSticky variant={GUIDE_SECTION_STICKY_VARIANT.impact} staggerIndex={1}>
        <div className="flex items-center gap-2">
          <MentrixaVocabIcon
            name={CANONICAL_IMPACT_SCORE_ICON}
            size={18}
            gold={impactTone === "gold"}
            surface="light"
            title="Guide Impact Score"
          />
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#7C3AED]">
            {GUIDE_HOME.impactHeroTitle}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <GuideImpactProgressRing score={impactScore} size={72} className="shrink-0" />
          <div className="min-w-0 flex-1">
            {data.impactVerdict ? (
              <VerdictPanel verdict={data.impactVerdict} tone="light" className="space-y-1.5" />
            ) : (
              <p className="text-xs leading-snug text-[#475569]">{GUIDE_HOME.impactEmpty}</p>
            )}
          </div>
        </div>
        <GuideBrowseImpactChips
          chips={toTopImpactChips(data.impactNodeScores, 3)}
          className="mt-3 border-t border-[#C4B5FD]/50 pt-2"
        />
      </GuideAnimatedSticky>

      <GuideAnimatedSticky variant={GUIDE_SECTION_STICKY_VARIANT.schedule} staggerIndex={2}>
        <div className="mb-2 flex items-center gap-2">
          <MentrixaVocabIcon name={CANONICAL_SESSION_ICON} size={18} surface="light" title="Sessions" />
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#7C3AED]">
            {GUIDE_HOME.upcomingHeroTitle}
          </p>
        </div>
        {upcoming.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#A5B4FC] bg-[#EDE9FE]/40 px-3 py-4 text-center">
            <p className="text-sm font-medium text-[#475569]">{GUIDE_HOME.upcomingEmpty}</p>
            <button
              type="button"
              onClick={onSetAvailability}
              className={cn(mentrixStudent.hubBtnSolid, "mt-3 cursor-pointer px-3 py-1.5 text-xs")}
            >
              Set availability →
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((session) => {
              const name = studentDisplayNameFromSession(session);
              return (
                <li key={session.id}>
                  <Card className="border-[#E0E7FF] bg-white/85 shadow-[1px_2px_0_rgba(11,18,32,0.06)]">
                    <CardContent className="space-y-1 p-3">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-[#0B1220]">
                        <MentrixaVocabIcon name="profile" size={14} surface="light" title="Student" />
                        {name}
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px] text-[#475569]">
                        <MentrixaVocabIcon name={CANONICAL_SKILLS_ICON} size={12} surface="light" title="Subject" />
                        {session.course}
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px] font-mono text-[#64748B]">
                        <MentrixaVocabIcon name={CANONICAL_SESSION_ICON} size={12} surface="light" title="Time" />
                        {formatDateInZone(session.start_time, data.tutorTimezone)}{" "}
                        {formatTimeInZone(session.start_time, data.tutorTimezone)}
                      </p>
                      <Link
                        href={`#guide-brief-${session.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7C3AED] hover:text-[#6D28D9]"
                      >
                        <MentrixaVocabIcon name="brief" size={12} surface="light" title="Brief" />
                        View brief →
                      </Link>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </GuideAnimatedSticky>
    </div>
  );
}

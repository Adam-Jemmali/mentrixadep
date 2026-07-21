"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { formatDateInZone, formatTimeInZone } from "@/shared/core/time-format";
import {
  formatLiveBoardEventDescription,
  formatLiveBoardTimeAgo,
} from "@/features/live-board/live-board-messages-pure";
import type { StudentHomeData } from "@/features/student-home/load-student-home";
import {
  StudentHomeEmptyInvite,
  StudentHomeStickyCard,
} from "@/features/student-home/student-home-sticky-card";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { landingStickyVariantForIndex } from "@/features/student-profile/student-sticky-variants";
import {
  MentrixaVocabIcon,
  VOCAB_HEADING_ICON_SIZE,
} from "@/shared/icons/mentrixa-vocab-icons";
import {
  CANONICAL_BOOKING_ICON,
  CANONICAL_LEAGUE_ICON,
  CANONICAL_QUEST_ICON,
  CANONICAL_SESSION_ICON,
} from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";
import { BklitShimmer } from "@/shared/ui/bklit-shimmer";

function ScrollRevealSection({
  children,
  className,
  id,
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  index?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  useGsapScrollTriggerEffect((gsap, ScrollTrigger) => {
    const el = ref.current;
    if (!el || reduceMotion) return;

    const tween = gsap.from(el, {
      y: 48,
      opacity: 0,
      rotate: index % 2 === 0 ? -1.2 : 1.2,
      duration: 0.65,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      ScrollTrigger.refresh();
    };
  }, [index, reduceMotion]);

  return (
    <section ref={ref} id={id} className={cn("opacity-100", className)}>
      {children}
    </section>
  );
}

export function StudentHomeUpcomingSessions({
  sessions,
  timeZone,
  className,
}: {
  sessions: StudentHomeData["upcomingSessions"];
  timeZone: string;
  className?: string;
}) {
  return (
    <ScrollRevealSection id="upcoming-sessions" className={className} index={1}>
      <StudentHomeStickyCard variant="taped" icon={CANONICAL_SESSION_ICON} title="Upcoming sessions">
        {sessions.length === 0 ? (
          <StudentHomeEmptyInvite
            message="No Guide sessions booked yet."
            actionLabel="Book a session"
            actionHref="/student?sessionsTab=upcoming#sessions-history"
            icon={CANONICAL_BOOKING_ICON}
          />
        ) : (
          <ul className="space-y-2">
            {sessions.slice(0, 4).map((session) => (
              <li
                key={session.id}
                className="flex items-center gap-3 rounded-lg border border-[#E0E7FF] bg-white/80 px-3 py-2.5 shadow-[1px_2px_0_rgba(11,18,32,0.06)]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#C4B5FD] bg-[#EDE9FE]">
                  {session.tutor_avatar_url ? (
                    <Image
                      src={session.tutor_avatar_url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <MentrixaVocabIcon name="guide" size={22} surface="light" title="Guide" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#0B1220]">{session.tutor_name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-[#475569]">
                    <MentrixaVocabIcon name="session" size={14} surface="light" title="Session time" />
                    {formatDateInZone(session.start_time, timeZone)}
                    {" · "}
                    {formatTimeInZone(session.start_time, timeZone)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </StudentHomeStickyCard>
    </ScrollRevealSection>
  );
}

export function StudentHomeQuestPerformance({
  rows,
}: {
  rows: StudentHomeData["recentQuests"];
}) {
  return (
    <ScrollRevealSection id="recent-quest-performance" index={2}>
      <StudentHomeStickyCard variant="dog-ear" icon={CANONICAL_QUEST_ICON} title="Recent quest performance">
        {rows.length === 0 ? (
          <StudentHomeEmptyInvite
            message="No completed practice packs yet."
            actionLabel="Start Quest"
            actionHref="/student/quest"
            icon={CANONICAL_QUEST_ICON}
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
              return (
                <li
                  key={row.questId}
                  className="flex items-center justify-between rounded-lg border border-[#E0E7FF] bg-white/75 px-3 py-2.5"
                >
                  <div className="flex items-start gap-2">
                    <MentrixaVocabIcon
                      name="practice-pack"
                      size={VOCAB_HEADING_ICON_SIZE * 0.44}
                      surface="light"
                      title="Practice pack"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#0B1220]">
                        {row.correct}/{row.total} correct
                        {row.perfect ? " · Perfect" : ""}
                      </p>
                      <p className="text-xs text-[#475569]">{row.subject}</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold tabular-nums text-[#6366F1]">{pct}%</span>
                </li>
              );
            })}
          </ul>
        )}
      </StudentHomeStickyCard>
    </ScrollRevealSection>
  );
}

export function StudentHomeArenaPreview({
  events,
}: {
  events: StudentHomeData["arenaPreview"];
}) {
  return (
    <ScrollRevealSection id="arena-preview" index={3}>
      <StudentHomeStickyCard
        variant="strip"
        icon="arena"
        title="Live arena"
        href="/student/division/arena"
        linkLabel="Open arena"
      >
        {events.length === 0 ? (
          <StudentHomeEmptyInvite
            message="Arena feed is quiet right now."
            actionLabel="See division arena"
            actionHref="/student/division/arena"
            icon="arena"
          />
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="rounded-lg border border-[#E0E7FF] bg-white/75 px-3 py-2.5">
                <p className="flex items-start gap-2 text-sm text-[#0B1220]">
                  <MentrixaVocabIcon name="arena" size={18} surface="light" title="Arena event" />
                  <span>{formatLiveBoardEventDescription(event)}</span>
                </p>
                <p className="mt-1 pl-7 text-xs text-[#475569]">{formatLiveBoardTimeAgo(event.occurred_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </StudentHomeStickyCard>
    </ScrollRevealSection>
  );
}

export function StudentHomeGuideRecommendation({
  guide,
}: {
  guide: StudentHomeData["recommendedGuide"];
}) {
  const reduceMotion = useReducedMotion();

  return (
    <ScrollRevealSection id="guide-recommendation" index={4}>
      <StudentHomeStickyCard variant="pinned" icon="guide" title="Guide recommendation">
        {!guide ? (
          <StudentHomeEmptyInvite
            message="No Guide match for your weakest nodes yet."
            actionLabel="Browse Guides"
            actionHref="/student#guide-recommendation"
            icon="guide"
          />
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#7C3AED] bg-[#EDE9FE]">
              {guide.avatarUrl ? (
                <Image
                  src={guide.avatarUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <MentrixaVocabIcon name="guide" size={28} surface="light" title="Guide" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#0B1220]">{guide.displayName}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#475569]">
                <span className="inline-flex items-center gap-1">
                  <MentrixaVocabIcon name="impact-score" size={14} surface="light" title="Impact score" />
                  Impact {Math.round(guide.impactScore)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MentrixaVocabIcon name="skill-node" size={14} surface="light" title="Weak nodes" />
                  {guide.matchedNodes.length} weak node match
                  {guide.matchedNodes.length === 1 ? "" : "es"}
                </span>
              </p>
            </div>
            <motion.div whileHover={reduceMotion ? undefined : { scale: 1.04 }} whileTap={reduceMotion ? undefined : { scale: 0.96 }}>
              <Link
                href="/student?sessionsTab=upcoming#sessions-history"
                className={cn(
                  mentrixStudent.hubBtnSolid,
                  "inline-flex shrink-0 cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-semibold",
                )}
              >
                <MentrixaVocabIcon
                  name={CANONICAL_BOOKING_ICON}
                  size={VOCAB_HEADING_ICON_SIZE * 0.32}
                  surface="light"
                  title="Book session"
                />
                Book
              </Link>
            </motion.div>
          </div>
        )}
      </StudentHomeStickyCard>
    </ScrollRevealSection>
  );
}

export function StudentHomeDivisionCompact({
  division,
}: {
  division: StudentHomeData["division"];
}) {
  return (
    <ScrollRevealSection id="division-standings" index={5}>
      <StudentHomeStickyCard
        variant={landingStickyVariantForIndex(5)}
        icon={CANONICAL_LEAGUE_ICON}
        title="Division standings"
        href="/student/division"
        linkLabel="Open league"
      >
        {division.status === "no_division" ? (
          <StudentHomeEmptyInvite
            message="Earn division XP in Quest or Duels to enter the league table."
            actionLabel="Start Quest"
            actionHref="/student/quest"
            icon={CANONICAL_LEAGUE_ICON}
          />
        ) : (
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-[#0B1220]">
              <MentrixaVocabIcon name="leaderboard" size={20} surface="light" title="Rank" />
              Rank #{division.myRank ?? "—"}
              <MentrixaVocabIcon name="xp" size={18} surface="light" title="Division XP" />
              {division.myXp ?? 0} XP
            </p>
            {division.status === "has_rival" ? (
              <p className="flex items-center gap-2 text-[#475569]">
                <MentrixaVocabIcon name="rival" size={18} surface="light" title="Rival" />
                {division.xpGap ?? 0} XP behind {division.rivalName} for the next spot.
              </p>
            ) : (
              <p className="flex items-center gap-2 text-[#475569]">
                <MentrixaVocabIcon name={CANONICAL_LEAGUE_ICON} size={18} surface="light" title="League" />
                You hold the top spot in your division.
              </p>
            )}
          </div>
        )}
      </StudentHomeStickyCard>
    </ScrollRevealSection>
  );
}

export function StudentHomeGridFallback() {
  return (
    <div className={cn(mentrixStudent.hubNotebook, "space-y-3")} aria-busy="true">
      <BklitShimmer className="h-40 w-full rounded-lg" aria-label="Loading mastery grid" />
    </div>
  );
}

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
import { AvailabilityBrowser } from "@/app/(app)/student/availability-browser";
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
  CANONICAL_DUELS_ICON,
  CANONICAL_LEAGUE_ICON,
  CANONICAL_QUEST_ICON,
  CANONICAL_SESSION_ICON,
} from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";
import { BklitShimmer } from "@/shared/ui/bklit-shimmer";
import {
  homeListContainerVariants,
  homeListItemVariants,
  homeSectionReveal,
} from "@/features/student-home/student-home-motion";

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
      y: homeSectionReveal.y,
      opacity: 0,
      rotate: index % 2 === 0 ? -0.8 : 0.8,
      duration: homeSectionReveal.duration,
      ease: homeSectionReveal.ease,
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

function HomeMotionList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <ul className={className}>{children}</ul>;
  }

  return (
    <motion.ul
      className={className}
      variants={homeListContainerVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.ul>
  );
}

function HomeMotionListItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <li className={className}>{children}</li>;
  }

  return (
    <motion.li className={className} variants={homeListItemVariants}>
      {children}
    </motion.li>
  );
}

export function StudentHomeUpcomingSessions({
  sessions,
  timeZone,
  className,
  staggerIndex = 3,
}: {
  sessions: StudentHomeData["upcomingSessions"];
  timeZone: string;
  className?: string;
  staggerIndex?: number;
}) {
  return (
    <ScrollRevealSection id="upcoming-sessions" className={className} index={1}>
      <StudentHomeStickyCard
        variant="taped"
        icon={CANONICAL_SESSION_ICON}
        title="Upcoming sessions"
        href="/student?sessionsTab=upcoming#sessions-history"
        linkLabel="All sessions"
        staggerIndex={staggerIndex}
      >
        {sessions.length === 0 ? (
          <StudentHomeEmptyInvite
            message="No Guide sessions booked yet."
            actionLabel="Book a session"
            actionHref="/student?sessionsTab=upcoming#sessions-history"
            icon={CANONICAL_BOOKING_ICON}
          />
        ) : (
          <HomeMotionList className="space-y-1.5">
            {sessions.slice(0, 4).map((session) => (
              <HomeMotionListItem
                key={session.id}
                className="flex items-center gap-2.5 rounded-lg border border-[#E0E7FF] bg-white/80 px-2.5 py-2 shadow-[1px_2px_0_rgba(11,18,32,0.06)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#C4B5FD] bg-[#EDE9FE]">
                  {session.tutor_avatar_url ? (
                    <Image
                      src={session.tutor_avatar_url}
                      alt=""
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <MentrixaVocabIcon name="guide" size={20} surface="light" title="Guide" />
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
              </HomeMotionListItem>
            ))}
          </HomeMotionList>
        )}
      </StudentHomeStickyCard>
    </ScrollRevealSection>
  );
}

export function StudentHomeQuestPerformance({
  rows,
  staggerIndex = 5,
}: {
  rows: StudentHomeData["recentQuests"];
  staggerIndex?: number;
}) {
  return (
    <ScrollRevealSection id="recent-quest-performance" index={2}>
      <StudentHomeStickyCard variant="dog-ear" icon={CANONICAL_QUEST_ICON} title="Recent quest performance" staggerIndex={staggerIndex}>
        {rows.length === 0 ? (
          <StudentHomeEmptyInvite
            message="No completed practice packs yet."
            actionLabel="Start Quest"
            actionHref="/student/quest"
            icon={CANONICAL_QUEST_ICON}
          />
        ) : (
          <HomeMotionList className="space-y-1.5">
            {rows.map((row) => {
              const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
              return (
                <HomeMotionListItem
                  key={row.questId}
                  className="flex items-center justify-between rounded-lg border border-[#E0E7FF] bg-white/75 px-2.5 py-2"
                >
                  <div className="flex items-start gap-2">
                    <MentrixaVocabIcon
                      name="practice-pack"
                      size={VOCAB_HEADING_ICON_SIZE * 0.4}
                      surface="light"
                      title="Practice pack"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#0B1220]">
                        {row.correct}/{row.total} correct
                        {row.perfect ? " · Perfect" : ""}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-[#475569]">
                        <MentrixaVocabIcon name="skill-node" size={12} surface="light" title="Subject" />
                        {row.subject}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold tabular-nums text-[#6366F1]">{pct}%</span>
                </HomeMotionListItem>
              );
            })}
          </HomeMotionList>
        )}
      </StudentHomeStickyCard>
    </ScrollRevealSection>
  );
}

export function StudentHomeLeagueHub({
  division,
  events,
  staggerIndex = 6,
}: {
  division: StudentHomeData["division"];
  events: StudentHomeData["arenaPreview"];
  staggerIndex?: number;
}) {
  const reduceMotion = useReducedMotion();
  const duelHref = "/student/duel";
  const leagueHref = "/student/division";
  const primaryHref =
    division.status === "no_division"
      ? "/student/quest"
      : division.ctaLane === "duel"
        ? duelHref
        : leagueHref;
  const primaryLabel =
    division.status === "no_division"
      ? "Start Quest"
      : division.ctaLane === "duel"
        ? "Defend in Duels"
        : "Open league";

  return (
    <ScrollRevealSection id="division-standings" index={3}>
      <StudentHomeStickyCard
        variant="strip"
        icon={CANONICAL_LEAGUE_ICON}
        title="Division league"
        href={leagueHref}
        linkLabel="League table"
        staggerIndex={staggerIndex}
      >
        {division.status === "no_division" ? (
          <StudentHomeEmptyInvite
            message="Earn division XP in Quest or Duels to enter the weekly league table."
            actionLabel="Start Quest"
            actionHref="/student/quest"
            icon={CANONICAL_QUEST_ICON}
          />
        ) : (
          <div className="space-y-2.5 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-semibold text-[#0B1220]">
              <MentrixaVocabIcon name="leaderboard" size={18} surface="light" title="Rank" />
              Rank #{division.myRank ?? "—"}
              <MentrixaVocabIcon name="xp" size={16} surface="light" title="Division XP" />
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
                You hold the top spot in your division this week.
              </p>
            )}

            {events.length > 0 ? (
              <HomeMotionList className="space-y-1.5 border-t border-[#E0E7FF] pt-2">
                {events.slice(0, 3).map((event) => (
                  <HomeMotionListItem
                    key={event.id}
                    className="rounded-lg border border-[#E0E7FF] bg-white/75 px-2.5 py-1.5"
                  >
                    <p className="flex items-start gap-2 text-sm text-[#0B1220]">
                      <MentrixaVocabIcon name={CANONICAL_DUELS_ICON} size={16} surface="light" title="Arena activity" />
                      <span>{formatLiveBoardEventDescription(event)}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 pl-6 text-xs text-[#475569]">
                      <MentrixaVocabIcon name="day" size={12} surface="light" title="Time ago" />
                      {formatLiveBoardTimeAgo(event.occurred_at)}
                    </p>
                  </HomeMotionListItem>
                ))}
              </HomeMotionList>
            ) : null}

            <motion.div whileTap={reduceMotion ? undefined : { scale: 0.96 }}>
              <Link
                href={primaryHref}
                className={cn(
                  mentrixStudent.hubBtnSolid,
                  "inline-flex w-full items-center justify-center gap-2 sm:w-auto",
                )}
              >
                <MentrixaVocabIcon
                  name={division.ctaLane === "duel" ? CANONICAL_DUELS_ICON : CANONICAL_LEAGUE_ICON}
                  size={18}
                  surface="light"
                  title={primaryLabel}
                />
                {primaryLabel}
              </Link>
            </motion.div>
          </div>
        )}
      </StudentHomeStickyCard>
    </ScrollRevealSection>
  );
}

export function StudentHomeGuideRecommendation({
  guide,
  staggerIndex = 7,
}: {
  guide: StudentHomeData["recommendedGuide"];
  staggerIndex?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <ScrollRevealSection id="guide-recommendation" index={4}>
      <StudentHomeStickyCard variant="pinned" icon="guide" title="Guide recommendation" staggerIndex={staggerIndex}>
        {!guide ? (
          <StudentHomeEmptyInvite
            message="No Guide match for your weakest nodes yet."
            actionLabel="Browse Guides"
            actionHref="/student#browse-guides"
            icon="guide"
          />
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#7C3AED] bg-[#EDE9FE]">
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
                href="/student#browse-guides"
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


export function StudentHomeBrowseGuides({
  hub,
  timeZone,
  staggerIndex = 7,
}: {
  hub: import("@/features/student-home/load-student-hub-dashboard").StudentHubDashboardData;
  timeZone: string;
  staggerIndex?: number;
}) {
  return (
    <ScrollRevealSection id="browse-guides" className="scroll-mt-20" index={4}>
      <StudentHomeStickyCard
        variant={landingStickyVariantForIndex(4)}
        icon={CANONICAL_BOOKING_ICON}
        title="Browse and book"
        staggerIndex={staggerIndex}
      >
        <p className="mb-2 flex items-center gap-1.5 text-xs text-[#475569]">
          <MentrixaVocabIcon name="skill-node" size={14} surface="light" title="Weakest nodes" />
          Book on your weakest nodes. Past study packages live in Sessions history.
        </p>
        <AvailabilityBrowser
          availability={hub.availability}
          courses={hub.availableCourses}
          studentCourseNames={hub.studentCourses.map((course) => course.course_name)}
          tutorExpertise={hub.tutorExpertise}
          displayTimeZone={timeZone}
          guideNodeImpactRolling={hub.guideNodeImpactRolling}
          weakestRollingNode={hub.weakestRollingNode}
          momentumSubscriber={hub.momentumSubscriber}
          sessionCreditAvailable={hub.sessionCreditAvailable}
          packSprintCreditsRemaining={hub.packSprintCreditsRemaining}
          monthlyCreditsRemaining={hub.monthlyCreditsRemaining}
          rematchBadgesByTutorId={hub.rematchBadgesByTutorId}
        />
      </StudentHomeStickyCard>
    </ScrollRevealSection>
  );
}

export function StudentHomeSessionsShell({
  children,
  staggerIndex = 7,
}: {
  children: ReactNode;
  staggerIndex?: number;
}) {
  return (
    <ScrollRevealSection id="sessions-history" className="scroll-mt-20" index={5}>
      <StudentHomeStickyCard
        variant="clip"
        icon={CANONICAL_SESSION_ICON}
        title="Sessions"
        href="/student?sessionsTab=upcoming#sessions-history"
        linkLabel="Upcoming"
        staggerIndex={staggerIndex}
        headerClassName="mb-1"
      >
        {children}
      </StudentHomeStickyCard>
    </ScrollRevealSection>
  );
}

export function StudentHomeGridFallback() {
  return (
    <div className="home-sticky-shell" aria-busy="true">
      <BklitShimmer className="h-32 w-full rounded-lg" aria-label="Loading mastery grid" />
    </div>
  );
}

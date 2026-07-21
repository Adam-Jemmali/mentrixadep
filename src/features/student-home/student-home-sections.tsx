"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { formatDateInZone, formatTimeInZone } from "@/shared/core/time-format";
import {
  formatLiveBoardEventDescription,
  formatLiveBoardTimeAgo,
} from "@/features/live-board/live-board-messages-pure";
import type { StudentHomeData } from "@/features/student-home/load-student-home";
import { cn } from "@/shared/core/utils";
import { BklitShimmer } from "@/shared/ui/bklit-shimmer";

function ScrollRevealSection({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGsapScrollTriggerEffect((gsap, ScrollTrigger) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tween = gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      ScrollTrigger.refresh();
    };
  }, []);

  return (
    <section ref={ref} id={id} className={cn("opacity-100", className)}>
      {children}
    </section>
  );
}

function EmptyInvite({
  message,
  actionLabel,
  actionHref,
}: {
  message: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--mx-muted)]">{message}</p>
      <Link
        href={actionHref}
        className="inline-flex rounded-[var(--radius-card)] bg-[var(--mx-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--mx-primary-hover)]"
      >
        {actionLabel}
      </Link>
    </div>
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
    <ScrollRevealSection id="upcoming-sessions" className={className}>
      <Card className="border-white/10 bg-[var(--mx-surface-2)] text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-white">Upcoming sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? (
            <EmptyInvite
              message="No Guide sessions booked yet."
              actionLabel="Book a session"
              actionHref="/student?sessionsTab=upcoming#sessions-history"
            />
          ) : (
            sessions.slice(0, 4).map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-white/8 bg-[var(--mx-surface-3)]/50 px-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--mx-indigo)]/20 text-sm font-bold text-[var(--mx-indigo)]">
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
                    session.tutor_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{session.tutor_name}</p>
                  <p className="text-xs text-[var(--mx-muted)]">
                    {formatDateInZone(session.start_time, timeZone)}
                    {" · "}
                    {formatTimeInZone(session.start_time, timeZone)}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </ScrollRevealSection>
  );
}

export function StudentHomeQuestPerformance({
  rows,
}: {
  rows: StudentHomeData["recentQuests"];
}) {
  return (
    <ScrollRevealSection id="recent-quest-performance">
      <Card className="border-white/10 bg-[var(--mx-surface-2)] text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-white">Recent quest performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <EmptyInvite
              message="No completed practice packs yet."
              actionLabel="Start Quest"
              actionHref="/student/quest"
            />
          ) : (
            rows.map((row) => {
              const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
              return (
                <div
                  key={row.questId}
                  className="flex items-center justify-between rounded-[var(--radius-card)] border border-white/8 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {row.correct}/{row.total} correct
                      {row.perfect ? " · Perfect" : ""}
                    </p>
                    <p className="text-xs text-[var(--mx-muted)]">{row.subject}</p>
                  </div>
                  <span className="font-mono text-sm font-bold tabular-nums text-[var(--mx-indigo)]">
                    {pct}%
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </ScrollRevealSection>
  );
}

export function StudentHomeArenaPreview({
  events,
}: {
  events: StudentHomeData["arenaPreview"];
}) {
  return (
    <ScrollRevealSection id="arena-preview">
      <Card className="border-white/10 bg-[var(--mx-surface-2)] text-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-white">Live arena</CardTitle>
          <Link href="/student/division/arena" className="text-xs font-semibold text-[var(--mx-indigo)] hover:text-[var(--mx-primary)]">
            Open arena
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 ? (
            <EmptyInvite
              message="Arena feed is quiet right now."
              actionLabel="See division arena"
              actionHref="/student/division/arena"
            />
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded-[var(--radius-card)] border border-white/8 px-3 py-2.5">
                <p className="text-sm text-white">{formatLiveBoardEventDescription(event)}</p>
                <p className="mt-1 text-xs text-[var(--mx-muted)]">
                  {formatLiveBoardTimeAgo(event.occurred_at)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </ScrollRevealSection>
  );
}

export function StudentHomeGuideRecommendation({
  guide,
}: {
  guide: StudentHomeData["recommendedGuide"];
}) {
  return (
    <ScrollRevealSection id="guide-recommendation">
      <Card className="border-white/10 bg-[var(--mx-surface-2)] text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-white">Guide recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          {!guide ? (
            <EmptyInvite
              message="No Guide match surfaced for your weakest nodes yet."
              actionLabel="Browse Guides"
              actionHref="/student#guide-recommendation"
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--mx-primary)]/20 text-sm font-bold text-[var(--mx-primary)]">
                {guide.avatarUrl ? (
                  <Image src={guide.avatarUrl} alt="" width={44} height={44} className="h-full w-full object-cover" unoptimized />
                ) : (
                  guide.displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{guide.displayName}</p>
                <p className="text-xs text-[var(--mx-muted)]">
                  Impact {Math.round(guide.impactScore)} · {guide.matchedNodes.length} weak node match
                  {guide.matchedNodes.length === 1 ? "" : "es"}
                </p>
              </div>
              <Link
                href="/student?sessionsTab=upcoming#sessions-history"
                className="shrink-0 rounded-[var(--radius-card)] bg-[var(--mx-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--mx-primary-hover)]"
              >
                Book
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </ScrollRevealSection>
  );
}

export function StudentHomeDivisionCompact({
  division,
}: {
  division: StudentHomeData["division"];
}) {
  return (
    <ScrollRevealSection id="division-standings">
      <Card className="border-white/10 bg-[var(--mx-surface-2)] text-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold text-white">Division standings</CardTitle>
          <Link href="/student/division" className="text-xs font-semibold text-[var(--mx-indigo)] hover:text-[var(--mx-primary)]">
            Open league
          </Link>
        </CardHeader>
        <CardContent>
          {division.status === "no_division" ? (
            <EmptyInvite
              message="Earn division XP in Quest or Duels to enter the league table."
              actionLabel="Start Quest"
              actionHref="/student/quest"
            />
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-white">
                Rank #{division.myRank ?? "—"} · {division.myXp ?? 0} XP
              </p>
              {division.status === "has_rival" ? (
                <p className="text-[var(--mx-muted)]">
                  {division.xpGap ?? 0} XP behind {division.rivalName} for the next spot.
                </p>
              ) : (
                <p className="text-[var(--mx-muted)]">You hold the top spot in your division.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </ScrollRevealSection>
  );
}

export function StudentHomeGridFallback() {
  return (
    <div className="space-y-3" aria-busy="true">
      <BklitShimmer className="h-40 w-full rounded-[var(--radius-card)]" aria-label="Loading mastery grid" />
    </div>
  );
}

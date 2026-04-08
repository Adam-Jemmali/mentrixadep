"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UpcomingSessionCard } from "./session-components/upcoming-session-card";
import { PastSessionCard } from "./session-components/past-session-card";
import { RateSessionFloating } from "./session-components/rate-session-floating";
import type { StudentSessionTutorProfile } from "@/app/actions/student";
import type { SessionAiPackage } from "@/lib/database.types";

import { countUp as gsapCountUp } from "@/lib/gsap";

const RATE_FLOAT_DISMISSED_KEY = "mentrixa-rate-float-dismissed-ids";

function loadRateFloatDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(RATE_FLOAT_DISMISSED_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function persistRateFloatDismissedIds(ids: Set<string>) {
  const arr = [...ids];
  const trimmed = arr.length > 200 ? arr.slice(-200) : arr;
  localStorage.setItem(RATE_FLOAT_DISMISSED_KEY, JSON.stringify(trimmed));
}

interface Session {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  status?: string;
  tutor_id?: string | null;
  tutor: StudentSessionTutorProfile;
  ratings?: Array<{
    id: string;
    rating: number;
    comment: string | null;
  }>;
  ai_package?: SessionAiPackage | null;
}

interface SessionsListProps {
  upcomingSessions: Session[];
  pastSessions: Session[];
  totalXp: number;
  streak: number;
  children?: React.ReactNode;
  showHeroStats?: boolean;
}

export function SessionsList({
  upcomingSessions,
  pastSessions,
  totalXp,
  streak,
  children,
  showHeroStats = true,
}: SessionsListProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  /** null = not hydrated from localStorage yet (avoid flashing the prompt). */
  const [rateFloatDismissedIds, setRateFloatDismissedIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    setRateFloatDismissedIds(loadRateFloatDismissedIds());
  }, []);

  const dismissRateFloatForSession = useCallback((sessionId: string) => {
    setRateFloatDismissedIds((prev) => {
      const next = new Set(prev ?? []);
      next.add(sessionId);
      persistRateFloatDismissedIds(next);
      return next;
    });
  }, []);

  const filteredUpcoming = useMemo(
    () => upcomingSessions.filter((s) => s.status !== "cancelled"),
    [upcomingSessions],
  );

  const floatingSession = useMemo(() => {
    if (rateFloatDismissedIds === null) return null;
    for (const s of pastSessions) {
      if (rateFloatDismissedIds.has(s.id)) continue;
      const statusLower = (s.status ?? "").toLowerCase();
      const hasRating = !!(s.ratings && s.ratings.length > 0);
      const hasTutor = !!(s.tutor_id ?? s.tutor?.id);
      if (!hasRating && statusLower !== "cancelled" && hasTutor) return s;
    }
    return null;
  }, [pastSessions, rateFloatDismissedIds]);

  const totalXpRef = useRef<HTMLSpanElement | null>(null);
  const streakRef = useRef<HTMLSpanElement | null>(null);
  const sessionsRef = useRef<HTMLSpanElement | null>(null);
  const ratingRef = useRef<HTMLSpanElement | null>(null);
  const xpFillRef = useRef<HTMLDivElement | null>(null);

  const sessionsCompleted = pastSessions.filter(
    (s) => s.completed || s.status === "completed",
  ).length;
  const avgRating = useMemo(() => {
    const ratings = pastSessions.flatMap((s) => s.ratings ?? []);
    if (!ratings.length) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return sum / ratings.length;
  }, [pastSessions]);

  const { currentLevel, nextLevel, xpToNext, maxXpForBar } = useLevelInfo(totalXp);

  useEffect(() => {
    if (!showHeroStats) return;
    if (totalXpRef.current) gsapCountUp(totalXpRef.current, totalXp);
    if (streakRef.current) gsapCountUp(streakRef.current, streak);
    if (sessionsRef.current) gsapCountUp(sessionsRef.current, sessionsCompleted);
    if (ratingRef.current) gsapCountUp(ratingRef.current, Math.round(avgRating * 10) / 10, 1.2);

    if (xpFillRef.current) {
      const ratio = maxXpForBar > 0 ? Math.min(totalXp / maxXpForBar, 1) : 0;
      gsap.set(xpFillRef.current, { transformOrigin: "left center", scaleX: 0 });
      gsap.to(xpFillRef.current, {
        scaleX: ratio,
        duration: 1,
        ease: "power3.out",
        delay: 0.4,
      });
    }
  }, [showHeroStats, totalXp, streak, sessionsCompleted, avgRating, maxXpForBar]);

  useEffect(() => {
    if (!showHeroStats) return;
    const cells = document.querySelectorAll(".mentrixa-stat-cell");
    if (cells.length === 0) return;
    gsap.from(cells, {
      opacity: 0,
      y: 6,
      duration: 0.4,
      stagger: 0.06,
      ease: "power2.out",
    });
  }, [showHeroStats]);

  const animateCards = useCallback(() => {
    const panel = document.querySelector(`[data-student-sessions-tab="${activeTab}"]`);
    const cards = panel?.querySelectorAll(".session-card") ?? [];
    if (cards.length === 0) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.28,
        stagger: 0.05,
        ease: "power2.out",
        clearProps: "opacity,transform",
      },
    );
  }, [activeTab]);

  useEffect(() => {
    animateCards();
  }, [activeTab, filteredUpcoming.length, pastSessions.length, animateCards]);

  return (
    <>
      {showHeroStats ? (
        <>
          <div className="stat-cells-animate grid grid-cols-2 gap-px rounded-md border border-slate-200 bg-slate-200 mb-4 md:grid-cols-4">
            <div className="mentrixa-stat-cell flex flex-col bg-white px-4 py-3 sm:px-5 sm:py-4">
              <span
                ref={totalXpRef}
                className="xp-number text-2xl font-medium tabular-nums text-slate-900"
              />
              <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Total XP
              </span>
            </div>
            <div className="mentrixa-stat-cell flex flex-col bg-white px-4 py-3 sm:px-5 sm:py-4">
              <span
                ref={streakRef}
                className={`xp-number text-2xl font-medium tabular-nums ${
                  streak > 0 ? "text-slate-900" : "text-slate-600"
                }`}
              />
              <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Streak days
              </span>
            </div>
            <div className="mentrixa-stat-cell flex flex-col bg-white px-4 py-3 sm:px-5 sm:py-4">
              <span
                ref={sessionsRef}
                className="xp-number text-2xl font-medium tabular-nums text-slate-900"
              />
              <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Sessions completed
              </span>
            </div>
            <div className="mentrixa-stat-cell flex flex-col bg-white px-4 py-3 sm:px-5 sm:py-4">
              <span
                ref={ratingRef}
                className="xp-number text-2xl font-medium tabular-nums text-slate-900"
              />
              <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Avg rating
              </span>
            </div>
          </div>

          <div className="mb-8 flex flex-wrap items-center gap-4 rounded-md border border-slate-200 bg-white px-4 py-3">
            <div className="min-w-[12rem] text-sm text-slate-700">
              {currentLevel} — {xpToNext > 0 ? `${xpToNext} XP to ${nextLevel}` : "Top of track"}
            </div>
            <div className="min-w-[120px] flex-1">
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  ref={xpFillRef}
                  className="h-full w-full origin-left scale-x-0 bg-slate-900"
                />
              </div>
            </div>
            <div className="text-xs font-mono text-slate-600 tabular-nums">
              {totalXp} / {maxXpForBar} XP
            </div>
          </div>
        </>
      ) : null}

      <div className={`lg:grid lg:grid-cols-3 lg:gap-8 ${showHeroStats ? "mt-8" : "mt-0"}`}>
        <div className="lg:col-span-2">
          <section>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upcoming" | "past")}>
              <TabsList className="mb-4 h-auto gap-0 rounded-none border-b border-slate-200 bg-transparent p-0">
                <TabsTrigger
                  value="upcoming"
                  className="mr-8 rounded-none border-b-2 border-transparent bg-transparent pb-2 text-sm font-medium text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
                >
                  Upcoming ({filteredUpcoming.length})
                </TabsTrigger>
                <TabsTrigger
                  value="past"
                  className="rounded-none border-b-2 border-transparent bg-transparent pb-2 text-sm font-medium text-slate-600 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
                >
                  Past ({pastSessions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="mt-0" data-student-sessions-tab="upcoming">
                {filteredUpcoming.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                    <p className="text-sm text-slate-600">No upcoming sessions.</p>
                    <Button variant="outline" size="sm" className="mt-4 border-slate-300" asChild>
                      <Link href="/student">Browse guides</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUpcoming.map((session) => (
                      <UpcomingSessionCard key={session.id} session={session} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-0" data-student-sessions-tab="past">
                {pastSessions.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                    <p className="text-sm text-slate-600">No past sessions.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastSessions.map((session) => (
                      <div key={session.id} id={`studio-${session.id}`} className="scroll-mt-24">
                        <PastSessionCard session={session} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </div>

        <div className="mt-10 lg:mt-0 lg:col-span-1">{children}</div>
      </div>

      <RateSessionFloating
        session={floatingSession}
        onDismiss={
          floatingSession ? () => dismissRateFloatForSession(floatingSession.id) : undefined
        }
      />
    </>
  );
}

function useLevelInfo(totalXp: number) {
  if (totalXp < 100) {
    return {
      currentLevel: "Learner",
      nextLevel: "Scholar",
      xpToNext: 100 - totalXp,
      maxXpForBar: 100,
    };
  }
  if (totalXp < 300) {
    return {
      currentLevel: "Scholar",
      nextLevel: "Expert",
      xpToNext: 300 - totalXp,
      maxXpForBar: 300,
    };
  }
  if (totalXp < 700) {
    return {
      currentLevel: "Expert",
      nextLevel: "Master",
      xpToNext: 700 - totalXp,
      maxXpForBar: 700,
    };
  }

  return {
    currentLevel: "Master",
    nextLevel: "Master",
    xpToNext: 0,
    maxXpForBar: totalXp || 700,
  };
}

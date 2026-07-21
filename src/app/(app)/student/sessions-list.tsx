"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { SessionStatusChip } from "@/shared/ui/chip-patterns";
import { UpcomingSessionCard } from "./session-components/upcoming-session-card";
import { PastSessionCard } from "./session-components/past-session-card";
import { RateSessionFloating } from "./session-components/rate-session-floating";
import { StudentWeekCalendar } from "./student-week-calendar";
import { TutorAvatar } from "./session-components/tutor-avatar";
import { StudentSessionTutorProfile } from "@/features/booking/session-lists";
import type { SessionAiPackage } from "@/shared/types/database";

import { useLevelInfo } from "@/features/xp/mentrixa-ranks";
import { formatSlotRangeInZone } from "@/shared/core/time-format";
import { readUiPerfTier } from "@/shared/core/ui-performance";
import { mentrixBrandUi, mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { mentrixHubSurfaces } from "@/features/student-profile/student-hub-surfaces";
import { MentrixaVocabIcon, XpIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

const RATE_FLOAT_DISMISSED_KEY = "mentrixa-rate-float-dismissed-ids";
const statCellClass = `${mentrixStudent.hubNotebook} flex flex-col rounded-2xl px-4 py-3 sm:px-5 sm:py-4`;

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
  studio_package_withdrawn_at?: string | null;
  has_studio_package_draft?: boolean;
}

interface SessionRequest {
  id: string;
  status: string;
  availability?: {
    course: string;
    start_time: string;
    end_time: string;
  };
  tutor: StudentSessionTutorProfile;
}

interface SessionsListProps {
  upcomingSessions: Session[];
  pastSessions: Session[];
  sessionRequests?: SessionRequest[];
  totalXp: number;
  streak: number;
  displayTimeZone?: string;
  weekRange?: { startIso: string; endIso: string };
  showHeroStats?: boolean;
  children?: React.ReactNode;
  /** From server searchParams for correct first paint / hydration when deep-linking. */
  initialOpenStudyPackageId?: string;
  initialSessionsTab?: "past" | "upcoming";
  momentumActive?: boolean;
  /** Nested inside a home sticky — strip inner notebook shell and side column layout. */
  embedded?: boolean;
}

export function SessionsList({
  upcomingSessions,
  pastSessions,
  sessionRequests = [],
  totalXp,
  streak,
  displayTimeZone = "UTC",
  weekRange: initialWeekRange,
  showHeroStats = true,
  children,
  initialOpenStudyPackageId = "",
  initialSessionsTab,
  momentumActive = false,
  embedded = false,
}: SessionsListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPkg = (initialOpenStudyPackageId ?? "").trim();
  const spOpenPkg = (searchParams.get("openStudyPackage") ?? "").trim();
  const sessionsTabParam =
    (searchParams.get("sessionsTab") ?? "").trim() ||
    (initialSessionsTab === "past"
      ? "past"
      : initialSessionsTab === "upcoming"
        ? "upcoming"
        : "");

  const [deepLinkPackageId, setDeepLinkPackageId] = useState(initialPkg);
  const openStudyPackageId = spOpenPkg || deepLinkPackageId;

  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "requests" | "schedule">(() => {
    if (sessionsTabParam === "past" || initialPkg || spOpenPkg) return "past";
    if (sessionsTabParam === "upcoming") return "upcoming";
    return "schedule";
  });
  const [rateFloatDismissedIds, setRateFloatDismissedIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    setRateFloatDismissedIds(loadRateFloatDismissedIds());
  }, []);

  useEffect(() => {
    if (sessionsTabParam === "past" || openStudyPackageId) {
      setActiveTab("past");
    } else if (sessionsTabParam === "upcoming") {
      setActiveTab("upcoming");
    }
  }, [sessionsTabParam, openStudyPackageId]);

  useEffect(() => {
    if (spOpenPkg && spOpenPkg !== deepLinkPackageId) {
      setDeepLinkPackageId(spOpenPkg);
    }
  }, [spOpenPkg, deepLinkPackageId]);

  useEffect(() => {
    if (!openStudyPackageId || activeTab !== "past") return;
    const el = document.getElementById(`studio-${openStudyPackageId}`);
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [openStudyPackageId, activeTab, pastSessions]);

  useEffect(() => {
    if (!openStudyPackageId || activeTab !== "past") return;
    const t = window.setTimeout(() => {
      setDeepLinkPackageId("");
      router.replace("/student#sessions-history", { scroll: false });
    }, 600);
    return () => window.clearTimeout(t);
  }, [openStudyPackageId, activeTab, router]);

  const dismissRateFloatForSession = useCallback((sessionId: string) => {
    setRateFloatDismissedIds((prev) => {
      const next = new Set(prev ?? []);
      next.add(sessionId);
      persistRateFloatDismissedIds(next);
      return next;
    });
  }, []);

  const weekRange = useMemo(() => {
    if (initialWeekRange) return initialWeekRange;
    
    const d = new Date();
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setUTCHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);
    
    return {
      startIso: monday.toISOString(),
      endIso: sunday.toISOString(),
    };
  }, [initialWeekRange]);

  const filteredRequests = useMemo(() => {
    return sessionRequests.filter(r => r.status === "pending" || r.status === "rejected");
  }, [sessionRequests]);

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

  const {
    currentLevel,
    nextLevel,
    xpToNext,
    progressPercent,
    barColorClass,
    currentRank,
  } = useLevelInfo(totalXp);

  useGsapEffect(
    (gsap) => {
      if (!showHeroStats) return;
      const lite = readUiPerfTier() === "lite";
      if (lite) {
        if (totalXpRef.current) totalXpRef.current.textContent = String(totalXp);
        if (streakRef.current) streakRef.current.textContent = String(streak);
        if (sessionsRef.current) sessionsRef.current.textContent = String(sessionsCompleted);
        if (ratingRef.current)
          ratingRef.current.textContent = String(Math.round(avgRating * 10) / 10);
        if (xpFillRef.current) {
          const ratio = Math.min(Math.max(progressPercent / 100, 0), 1);
          xpFillRef.current.style.transformOrigin = "left center";
          xpFillRef.current.style.transform = `scaleX(${ratio})`;
        }
        return;
      }
      void import("@/shared/core/gsap").then(({ countUp }) => {
        if (totalXpRef.current) countUp(totalXpRef.current, totalXp);
        if (streakRef.current) countUp(streakRef.current, streak);
        if (sessionsRef.current) countUp(sessionsRef.current, sessionsCompleted);
        if (ratingRef.current)
          countUp(ratingRef.current, Math.round(avgRating * 10) / 10, 1.2);
      });

      if (xpFillRef.current) {
        const ratio = Math.min(Math.max(progressPercent / 100, 0), 1);
        gsap.set(xpFillRef.current, { transformOrigin: "left center", scaleX: 0 });
        gsap.to(xpFillRef.current, {
          scaleX: ratio,
          duration: 1,
          ease: "power3.out",
          delay: 0.4,
        });
      }
    },
    [showHeroStats, totalXp, streak, sessionsCompleted, avgRating, progressPercent],
  );

  useGsapEffect(
    (gsap) => {
      if (!showHeroStats) return;
      if (readUiPerfTier() === "lite") return;
      const cells = document.querySelectorAll(".mentrixa-stat-cell");
      if (cells.length === 0) return;
      gsap.from(cells, {
        opacity: 0,
        y: 6,
        duration: 0.4,
        stagger: 0.06,
        ease: "power2.out",
      });
    },
    [showHeroStats],
  );

  const animateCards = useCallback(() => {
    if (readUiPerfTier() === "lite") return;
    const panel = document.querySelector(`[data-student-sessions-tab="${activeTab}"]`);
    const cards = panel?.querySelectorAll(".session-card") ?? [];
    if (cards.length === 0) return;
    void import("gsap").then(({ gsap }) => {
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
    });
  }, [activeTab]);

  useEffect(() => {
    animateCards();
  }, [activeTab, filteredUpcoming.length, pastSessions.length, animateCards]);

  const emptyShell = embedded
    ? "rounded-lg border border-dashed border-[#A5B4FC] bg-[#EDE9FE]/40 px-3 py-4 text-center text-[#475569]"
    : mentrixStudent.hubEmpty;

  return (
    <>
      {showHeroStats ? (
        <>
          <div className="stat-cells-animate mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={`mentrixa-stat-cell ${statCellClass}`}>
              <span className="inline-flex items-center gap-1.5">
                <span
                  ref={totalXpRef}
                  className="xp-number text-2xl font-bold tabular-nums text-indigo-300"
                />
                <XpIcon size={20} title="Total XP" />
              </span>
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-violet-300/75">
                Total XP
              </span>
            </div>
            <div className={`mentrixa-stat-cell ${statCellClass}`}>
              <span
                ref={streakRef}
                className={`xp-number text-2xl font-bold tabular-nums ${
                  streak > 0 ? "text-white" : "text-violet-200/80"
                }`}
              />
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-violet-300/75">
                Streak days
              </span>
            </div>
            <div className={`mentrixa-stat-cell ${statCellClass}`}>
              <span
                ref={sessionsRef}
                className="xp-number text-2xl font-bold tabular-nums text-white"
              />
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-violet-300/75">
                Sessions completed
              </span>
            </div>
            <div className={`mentrixa-stat-cell ${statCellClass}`}>
              <span
                ref={ratingRef}
                className="xp-number text-2xl font-bold tabular-nums text-white"
              />
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-violet-300/75">
                Avg rating
              </span>
            </div>
          </div>

          <div className={`mb-8 flex flex-col gap-4 ${mentrixBrandUi.panel} px-4 py-4 sm:flex-row sm:items-center sm:px-5`}>
            <div className="min-w-0 sm:min-w-[12rem]">
              <div className="flex flex-wrap items-center gap-2 sm:justify-start">
                <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-700">
                  {currentRank.badge}
                </span>
                <span className="text-sm font-semibold text-zinc-900">{currentLevel}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                {currentRank.division ? `Division ${currentRank.division}` : "Unique rank"}
              </p>
              <p className="mt-0.5 text-xs font-medium text-zinc-700">
                {xpToNext > 0 ? `${xpToNext} XP to ${nextLevel}` : "Top track"}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  ref={xpFillRef}
                  className={`h-full w-full origin-left scale-x-0 bg-gradient-to-r ${barColorClass}`}
                />
              </div>
            </div>
            <div className="text-xs font-mono font-medium text-zinc-600 tabular-nums sm:text-right inline-flex items-center justify-end gap-1.5">
              <XpIcon size={14} title="XP" />
              {totalXp}
            </div>
          </div>
        </>
      ) : null}

      <div
        className={
          children
            ? embedded
              ? "mt-0 flex flex-col gap-3"
              : `lg:grid lg:grid-cols-3 lg:gap-8 ${showHeroStats ? "mt-8" : "mt-0"}`
            : showHeroStats
              ? "mt-8"
              : ""
        }
      >
        <div className={children && !embedded ? "lg:col-span-2" : ""}>
          <section className={embedded ? "space-y-2" : mentrixStudent.hubSessionsPanel}>
            { }
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList
                className={cn(
                  "mx-hub-tabs-list flex h-auto w-full gap-2 overflow-x-auto rounded-xl p-1.5",
                  embedded ? "mb-2" : "mb-5",
                )}
              >
                <TabsTrigger
                  value="schedule"
                  className="mx-hub-tab-trigger flex-1 gap-2 px-3 py-2 transition-all"
                >
                  <MentrixaVocabIcon name="day" size={16} surface="light" title="Week" />
                  Week
                </TabsTrigger>
                <TabsTrigger
                  value="upcoming"
                  className="mx-hub-tab-trigger flex-1 gap-2 px-3 py-2 transition-all"
                >
                  <MentrixaVocabIcon name="session" size={16} surface="light" title="Upcoming" />
                  Upcoming ({filteredUpcoming.length})
                </TabsTrigger>
                <TabsTrigger
                  value="requests"
                  className="mx-hub-tab-trigger flex-1 gap-2 px-3 py-2 transition-all"
                >
                  <MentrixaVocabIcon name="booking" size={16} surface="light" title="Requests" />
                  Requests ({filteredRequests.length})
                </TabsTrigger>
                <TabsTrigger
                  value="past"
                  className="mx-hub-tab-trigger flex-1 gap-2 px-3 py-2 transition-all"
                >
                  <MentrixaVocabIcon name="loop-report" size={16} surface="light" title="History" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="schedule" className="mt-0">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={mentrixHubSurfaces.inkLabel}>Weekly Schedule</h3>
                  </div>
                  <StudentWeekCalendar 
                    calendar={{ 
                      weekRange, 
                      sessions: [...upcomingSessions, ...pastSessions].map(s => ({ ...s, status: s.status || "scheduled" })), 
                      sessionRequests 
                    }}
                    displayTimezone={displayTimeZone}
                  />
                </div>
              </TabsContent>

              <TabsContent value="upcoming" className="mt-0" data-student-sessions-tab="upcoming">
                {filteredUpcoming.length === 0 ? (
                  <div className={emptyShell}>
                    <p className={mentrixHubSurfaces.inkBody}>No upcoming sessions.</p>
                    <Link href="#browse-guides" className={`mt-5 ${mentrixStudent.hubBtnSolid}`}>
                      Browse guides
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUpcoming.map((session) => (
                      <UpcomingSessionCard key={session.id} session={session} displayTimeZone={displayTimeZone} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="requests" className="mt-0" data-student-sessions-tab="requests">
                {filteredRequests.length === 0 ? (
                  <div className={emptyShell}>
                    <p className={mentrixHubSurfaces.inkBody}>No active requests.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRequests.map((request) => (
                      <div key={request.id} className="session-card mx-hub-inner-card rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center border border-[#6366F1] overflow-hidden">
                             {request.tutor.avatar_url ? (
                              <Image src={request.tutor.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-[#6366F1]">{request.tutor.display_name?.[0]?.toUpperCase() ?? "G"}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-[#0B1220] text-base">{request.availability?.course.toUpperCase()}</h4>
                            <div className="flex items-center gap-2 text-base text-[#64748B] mb-1">
                              <TutorAvatar 
                                displayName={request.tutor.display_name} 
                                emailPrefix={request.tutor.display_name || "G"} 
                                avatarUrl={request.tutor.avatar_url} 
                                size="sm" 
                              />
                              <span>with {request.tutor.display_name}</span>
                            </div>
                            {request.availability && (
                              <p className="text-base text-[#64748B] mt-1 font-mono">
                                {formatSlotRangeInZone(request.availability.start_time, request.availability.end_time, displayTimeZone)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <SessionStatusChip status={request.status} tone="light" />
                          <p className="text-base text-[#64748B] mt-1">Sent recently</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-0" data-student-sessions-tab="past">
                {pastSessions.length === 0 ? (
                  <div className={emptyShell}>
                    <p className={mentrixHubSurfaces.inkBody}>No past sessions.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastSessions.map((session) => (
                      <div key={session.id} id={`studio-${session.id}`} className="scroll-mt-24">
                        <PastSessionCard
                          session={session}
                          displayTimeZone={displayTimeZone}
                          autoExpandStudyPackage={openStudyPackageId === session.id}
                          momentumActive={momentumActive}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </div>

        {children ? <div className={embedded ? "w-full" : "lg:col-span-1"}>{children}</div> : null}
      </div>

      <RateSessionFloating
        session={floatingSession}
        momentumActive={momentumActive}
        onDismiss={
          floatingSession ? () => dismissRateFloatForSession(floatingSession.id) : undefined
        }
      />
    </>
  );
}

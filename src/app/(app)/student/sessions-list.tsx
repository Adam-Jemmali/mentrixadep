"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { gsap } from "gsap";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UpcomingSessionCard } from "./session-components/upcoming-session-card";
import { PastSessionCard } from "./session-components/past-session-card";
import { RateSessionFloating } from "./session-components/rate-session-floating";
import { StudentWeekCalendar } from "./student-week-calendar";
import { cn } from "@/lib/utils";
import { TutorAvatar } from "./session-components/tutor-avatar";
import { Clock, Calendar as CalendarIcon, History as HistoryIcon, Send } from "lucide-react";
import { StudentSessionTutorProfile } from "@/app/actions/student";
import type { SessionAiPackage } from "@/lib/database.types";

import { countUp as gsapCountUp } from "@/lib/gsap";
import { useLevelInfo } from "@/lib/mentrixa-ranks";
import { formatSlotRangeInZone } from "@/lib/time-format";
import { readUiPerfTier } from "@/lib/ui-performance";
import { useUiPerfTier } from "@/lib/use-ui-perf-tier";

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
}: SessionsListProps) {
  const uiPerfTier = useUiPerfTier();
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

  useEffect(() => {
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
    if (totalXpRef.current) gsapCountUp(totalXpRef.current, totalXp);
    if (streakRef.current) gsapCountUp(streakRef.current, streak);
    if (sessionsRef.current) gsapCountUp(sessionsRef.current, sessionsCompleted);
    if (ratingRef.current) gsapCountUp(ratingRef.current, Math.round(avgRating * 10) / 10, 1.2);

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
  }, [showHeroStats, totalXp, streak, sessionsCompleted, avgRating, progressPercent]);

  useEffect(() => {
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
  }, [showHeroStats]);

  const animateCards = useCallback(() => {
    if (readUiPerfTier() === "lite") return;
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
          <div className="stat-cells-animate mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="mentrixa-stat-cell flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
              <span
                ref={totalXpRef}
                className="xp-number text-2xl font-bold tabular-nums text-blue-700"
              />
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Total XP
              </span>
            </div>
            <div className="mentrixa-stat-cell flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
              <span
                ref={streakRef}
                className={`xp-number text-2xl font-bold tabular-nums ${
                  streak > 0 ? "text-slate-900" : "text-slate-600"
                }`}
              />
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Streak days
              </span>
            </div>
            <div className="mentrixa-stat-cell flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
              <span
                ref={sessionsRef}
                className="xp-number text-2xl font-bold tabular-nums text-slate-900"
              />
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Sessions completed
              </span>
            </div>
            <div className="mentrixa-stat-cell flex flex-col rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
              <span
                ref={ratingRef}
                className="xp-number text-2xl font-bold tabular-nums text-slate-900"
              />
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Avg rating
              </span>
            </div>
          </div>

          <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:px-5">
            <div className="min-w-0 sm:min-w-[12rem]">
              <div className="flex flex-wrap items-center gap-2 sm:justify-start">
                <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                  {currentRank.badge}
                </span>
                <span className="text-sm font-semibold text-slate-900">{currentLevel}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {currentRank.division ? `Division ${currentRank.division}` : "Unique rank"}
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-700">
                {xpToNext > 0 ? `${xpToNext} XP to ${nextLevel}` : "Top track"}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  ref={xpFillRef}
                  className={`h-full w-full origin-left scale-x-0 bg-gradient-to-r ${barColorClass}`}
                />
              </div>
            </div>
            <div className="text-xs font-mono font-medium text-slate-600 tabular-nums sm:text-right">
              {totalXp} XP
            </div>
          </div>
        </>
      ) : null}

      <div className={`lg:grid lg:grid-cols-3 lg:gap-8 ${showHeroStats ? "mt-8" : "mt-0"}`}>
        <div className="lg:col-span-2">
          <section className="relative overflow-hidden rounded-2xl border border-white/20 bg-[linear-gradient(160deg,#182846_0%,#12223e_46%,#0d1c35_100%)] p-4 text-white shadow-[0_14px_38px_-24px_rgba(15,23,42,0.65)] sm:p-6">
            {uiPerfTier === "full" ? (
              <>
                <div className="pointer-events-none absolute inset-0 bg-[url('/mentrixalogo/logo.webp')] bg-[length:106px_106px] bg-repeat opacity-[0.055]" />
                <Image
                  src="/icons/mentrixer.svg"
                  alt=""
                  width={18}
                  height={18}
                  unoptimized
                  className="pointer-events-none absolute right-5 top-4 h-[18px] w-[18px] opacity-60 animate-[mentrixaLogoDrift_10s_linear_infinite]"
                />
                <Image
                  src="/icons/mentrixer.svg"
                  alt=""
                  width={16}
                  height={16}
                  unoptimized
                  className="pointer-events-none absolute right-20 bottom-5 h-4 w-4 opacity-45 animate-[mentrixaLogoDrift_12s_linear_infinite_reverse]"
                />
              </>
            ) : null}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="mb-5 flex h-auto w-full gap-2 rounded-xl border border-white/20 bg-white/10 p-1.5 overflow-x-auto">
                <TabsTrigger
                  value="schedule"
                  className="flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-md transition-all gap-2"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Week
                </TabsTrigger>
                <TabsTrigger
                  value="upcoming"
                  className="flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-md transition-all gap-2"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Upcoming ({filteredUpcoming.length})
                </TabsTrigger>
                <TabsTrigger
                  value="requests"
                  className="flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-md transition-all gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Requests ({filteredRequests.length})
                </TabsTrigger>
                <TabsTrigger
                  value="past"
                  className="flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/80 data-[state=active]:bg-white data-[state=active]:text-[#1E3A5F] data-[state=active]:shadow-md transition-all gap-2"
                >
                  <HistoryIcon className="w-3.5 h-3.5" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="schedule" className="mt-0">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/70">Weekly Schedule</h3>
                  
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
                  <div className="rounded-xl border border-white/25 bg-white/10 px-6 py-12 text-center">
                    <p className="text-sm font-medium text-white/85">No upcoming sessions.</p>
                    <Button
                      size="sm"
                      className="mt-5 rounded-md bg-white text-[#1E3A5F] px-6 font-semibold hover:bg-white/90"
                      asChild
                    >
                      <Link href="#browse-guides">Browse guides</Link>
                    </Button>
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
                  <div className="rounded-xl border border-white/25 bg-white/10 px-6 py-12 text-center">
                    <p className="text-sm font-medium text-white/85">No active requests.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRequests.map((request) => (
                      <div key={request.id} className="session-card rounded-xl border border-white/20 bg-white/5 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 overflow-hidden">
                             {request.tutor.avatar_url ? (
                              <Image src={request.tutor.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold">{request.tutor.display_name?.[0]?.toUpperCase() ?? "G"}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">{request.availability?.course.toUpperCase()}</h4>
                            <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
                              <TutorAvatar 
                                displayName={request.tutor.display_name} 
                                emailPrefix={request.tutor.display_name || "G"} 
                                avatarUrl={request.tutor.avatar_url} 
                                size="sm" 
                              />
                              <span>with {request.tutor.display_name}</span>
                            </div>
                            {request.availability && (
                              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                                {formatSlotRangeInZone(request.availability.start_time, request.availability.end_time, displayTimeZone)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={request.status === "rejected" ? "outline" : "default"} className={cn("text-[10px] uppercase font-bold px-2 py-0.5", request.status === "rejected" && "text-red-400 border-red-500/30 bg-red-500/10")}>
                            {request.status}
                          </Badge>
                          <p className="text-[10px] text-slate-500 mt-1">Sent recently</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-0" data-student-sessions-tab="past">
                {pastSessions.length === 0 ? (
                  <div className="rounded-xl border border-white/25 bg-white/10 px-6 py-12 text-center">
                    <p className="text-sm font-medium text-white/85">No past sessions.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastSessions.map((session) => (
                      <div key={session.id} id={`studio-${session.id}`} className="scroll-mt-24">
                        <PastSessionCard
                          session={session}
                          displayTimeZone={displayTimeZone}
                          autoExpandStudyPackage={openStudyPackageId === session.id}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </div>

      </div>

      {children}

      <RateSessionFloating
        session={floatingSession}
        onDismiss={
          floatingSession ? () => dismissRateFloatForSession(floatingSession.id) : undefined
        }
      />
    </>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { DeletePastSessionButton } from "@/components/delete-past-session-button";
import { CancelSessionButton } from "./cancel-session-button";
import { RateSessionForm } from "./rate-session-form";
import { JoinVideoCallButton } from "@/components/join-video-call-button";
import { formatDate, formatTime } from "@/lib/time-format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "../../components/ui/badge";
import { generateSessionPackage, getSessionPackage } from "@/app/actions/autoPilot";
import type { SessionAiPackage } from "@/lib/database.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { countUp as gsapCountUp } from "@/lib/gsap";

interface Session {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  status?: string;
  tutor_id?: string | null;
  tutor?: {
    id: string;
    role: string;
    email?: string;
  };
  ratings?: Array<{
    id: string;
    rating: number;
    comment: string | null;
  }>;
}

interface SessionsListProps {
  upcomingSessions: Session[];
  pastSessions: Session[];
  totalXp: number;
  streak: number;
  children?: React.ReactNode; // right column (guides browser)
}

export function SessionsList({
  upcomingSessions,
  pastSessions,
  totalXp,
  streak,
  children,
}: SessionsListProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const filteredUpcoming = useMemo(
    () => upcomingSessions.filter((s) => s.status !== "cancelled"),
    [upcomingSessions],
  );

  const totalXpRef = useRef<HTMLSpanElement | null>(null);
  const streakRef = useRef<HTMLSpanElement | null>(null);
  const sessionsRef = useRef<HTMLSpanElement | null>(null);
  const ratingRef = useRef<HTMLSpanElement | null>(null);
  const xpFillRef = useRef<HTMLDivElement | null>(null);

  const sessionsCompleted = pastSessions.filter((s) => s.completed || s.status === "completed").length;
  const avgRating = useMemo(() => {
    const ratings = pastSessions.flatMap((s) => s.ratings ?? []);
    if (!ratings.length) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return sum / ratings.length;
  }, [pastSessions]);

  const { currentLevel, nextLevel, xpToNext, maxXpForBar } = useLevelInfo(totalXp);

  useEffect(() => {
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
  }, [totalXp, streak, sessionsCompleted, avgRating, maxXpForBar]);

  useEffect(() => {
    const cells = document.querySelectorAll(".mentrixa-stat-cell");
    if (cells.length === 0) return;
    gsap.from(cells, {
      opacity: 0,
      y: 6,
      duration: 0.4,
      stagger: 0.06,
      ease: "power2.out",
    });
  }, []);

  useEffect(() => {
    // Only animate rows in the visible tab — Radix keeps inactive panels in the DOM; animating
    // hidden rows can leave them stuck at opacity 0.
    const panel = document.querySelector(`[data-student-sessions-tab="${activeTab}"]`);
    const rows = panel?.querySelectorAll("tbody tr.session-table-row") ?? [];
    if (rows.length === 0) return;
    gsap.fromTo(
      rows,
      { opacity: 0, y: 4 },
      {
        opacity: 1,
        y: 0,
        duration: 0.25,
        stagger: 0.03,
        ease: "power2.out",
        clearProps: "opacity,transform",
      },
    );
  }, [activeTab, filteredUpcoming.length, pastSessions.length]);

  return (
    <>
      {/* Stat bar – LeetCode-style strip */}
      <div className="stat-cells-animate grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 rounded-xl bg-slate-900 px-5 py-4 text-slate-50 shadow-sm ring-1 ring-slate-800/60">
        <div className="mentrixa-stat-cell flex flex-col rounded-lg px-3 py-2 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-800/70">
          <span
            ref={totalXpRef}
            className="xp-number text-[28px] font-bold tracking-[-0.03em] text-white"
          />
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-300 mt-0.5">Total XP</span>
        </div>
        <div className="mentrixa-stat-cell flex flex-col rounded-lg px-3 py-2 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-800/70">
          <span
            ref={streakRef}
            className={`xp-number text-[28px] font-bold tracking-[-0.03em] ${
              streak > 0 ? "text-blue-300" : "text-slate-100"
            }`}
          />
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-300 mt-0.5">Streak days</span>
        </div>
        <div className="mentrixa-stat-cell flex flex-col rounded-lg px-3 py-2 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-800/70">
          <span
            ref={sessionsRef}
            className="xp-number text-[28px] font-bold tracking-[-0.03em] text-white"
          />
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-300 mt-0.5">Sessions completed</span>
        </div>
        <div className="mentrixa-stat-cell flex flex-col rounded-lg px-3 py-2 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-800/70">
          <span
            ref={ratingRef}
            className="xp-number text-[28px] font-bold tracking-[-0.03em] text-sky-300"
          />
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-300 mt-0.5">Avg rating</span>
        </div>
      </div>

      {/* XP progress row */}
      <div className="border border-slate-200 py-3 mb-8 flex flex-wrap items-center gap-4 bg-white rounded-lg px-4 shadow-sm">
        <div className="text-xs md:text-sm text-slate-800 min-w-[190px] font-medium">
          {currentLevel} — {xpToNext > 0 ? `${xpToNext} XP to ${nextLevel}` : "Maxed for this track"}
        </div>
        <div className="flex-1 min-w-[120px]">
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              ref={xpFillRef}
              className="h-full w-full origin-left scale-x-0 bg-gradient-to-r from-mentrixa-600 to-mentrixa-700"
            />
          </div>
        </div>
        <div className="text-xs md:text-sm font-mono font-semibold text-slate-800 tabular-nums">
          {totalXp} / {maxXpForBar} XP
        </div>
      </div>

      {/* Main layout */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-8 mt-8">
        <div className="lg:col-span-2">
          <section>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upcoming" | "past")}>
              <TabsList className="bg-transparent p-0 mb-4 border-b border-slate-200 rounded-none h-auto">
                <TabsTrigger
                  value="upcoming"
                  className="mr-6 rounded-none bg-transparent pb-2 text-xs font-semibold data-[state=active]:border-b-2 data-[state=active]:border-mentrixa-600 data-[state=active]:text-slate-950 data-[state=inactive]:text-slate-700 border-b-2 border-transparent hover:text-slate-950"
                >
                  Upcoming ({filteredUpcoming.length})
                </TabsTrigger>
                <TabsTrigger
                  value="past"
                  className="mr-6 rounded-none bg-transparent pb-2 text-xs font-semibold data-[state=active]:border-b-2 data-[state=active]:border-mentrixa-600 data-[state=active]:text-slate-950 data-[state=inactive]:text-slate-700 border-b-2 border-transparent hover:text-slate-950"
                >
                  Past ({pastSessions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="mt-0">
                {filteredUpcoming.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-lg p-10 text-center bg-white">
                    <p className="text-sm text-slate-500 mb-3">No upcoming sessions.</p>
                    <Button variant="outline" size="sm">
                      Browse Guides
                    </Button>
                  </div>
                ) : (
                  <div
                    data-student-sessions-tab="upcoming"
                    className="mentrixa-table overflow-x-auto bg-white border border-slate-300 rounded-lg shadow-sm"
                  >
                    <table className="min-w-full text-xs">
                      <thead className="border-b-2 border-slate-300 bg-slate-200 text-slate-900">
                        <tr>
                          <th className="py-2.5 pr-4 text-left text-[11px] font-bold uppercase tracking-wide">
                            Course
                          </th>
                          <th className="py-2.5 pr-4 text-left text-[11px] font-bold uppercase tracking-wide">
                            Tutor
                          </th>
                          <th className="py-2.5 pr-4 text-left text-[11px] font-bold uppercase tracking-wide">
                            Date
                          </th>
                          <th className="py-2.5 pr-4 text-left text-[11px] font-bold uppercase tracking-wide">
                            Time
                          </th>
                          <th className="py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="align-middle text-slate-950">
                        {filteredUpcoming.map((session) => (
                          <UpcomingRow key={session.id} session={session} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="mt-0">
                {pastSessions.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-lg p-10 text-center bg-white">
                    <p className="text-sm text-slate-500">No past sessions.</p>
                  </div>
                ) : (
                  <div
                    data-student-sessions-tab="past"
                    className="mentrixa-table overflow-x-auto bg-white border border-slate-300 rounded-lg shadow-sm"
                  >
                    <table className="min-w-full text-xs">
                      <thead className="border-b-2 border-slate-300 bg-slate-200 text-slate-900">
                        <tr>
                          <th className="py-2.5 pr-4 text-left text-[11px] font-bold uppercase tracking-wide">
                            Course
                          </th>
                          <th className="py-2.5 pr-4 text-left text-[11px] font-bold uppercase tracking-wide">
                            Tutor
                          </th>
                          <th className="py-2.5 pr-4 text-left text-[11px] font-bold uppercase tracking-wide">
                            Date
                          </th>
                          <th className="py-2.5 pr-4 text-left text-[11px] font-bold uppercase tracking-wide">
                            Rating
                          </th>
                          <th className="py-2.5 pr-4 text-left text-[11px] font-bold uppercase tracking-wide">
                            AI Summary
                          </th>
                          <th className="py-2.5 text-left text-[11px] font-bold uppercase tracking-wide w-[1%] whitespace-nowrap">
                            History
                          </th>
                        </tr>
                      </thead>
                      <tbody className="align-middle text-slate-950">
                        {pastSessions.map((session) => (
                          <PastRow key={session.id} session={session} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </div>

        <div className="mt-10 lg:mt-0 lg:col-span-1">
          {children}
        </div>
      </div>
    </>
  );
}

function UpcomingRow({ session }: { session: Session }) {
  return (
    <tr
      data-session-id={session.id}
      className="session-table-row border-b border-slate-200 bg-white hover:bg-slate-100/90 transition-colors [&_td]:text-slate-950"
    >
      <td className="py-3 pr-4 align-middle">
        <Badge
          variant="outline"
          className="text-[11px] font-mono font-semibold border-slate-500 text-slate-950 bg-slate-50"
        >
          {session.course}
        </Badge>
      </td>
      <td className="py-3 pr-4 align-middle">
        <div className="text-sm font-semibold text-slate-950">
          {session.tutor?.email?.split("@")[0] ?? "Tutor"}
        </div>
      </td>
      <td className="py-3 pr-4 align-middle">
        <div className="text-sm font-medium text-slate-900">{formatDate(session.start_time)}</div>
      </td>
      <td className="py-3 pr-4 align-middle">
        <div className="text-sm font-mono font-medium tabular-nums text-slate-900">
          {formatTime(session.start_time)}
        </div>
      </td>
      <td className="py-3 align-middle">
        <div className="flex items-center gap-3">
          <JoinVideoCallButton
            sessionId={session.id}
            startTime={session.start_time}
            endTime={session.end_time}
          />
          <CancelSessionButton sessionId={session.id} startTime={session.start_time} />
        </div>
      </td>
    </tr>
  );
}

function PastRow({ session }: { session: Session }) {
  const router = useRouter();
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const statusLower = (session.status ?? "").toLowerCase();
  const isCompleted = statusLower === "completed" || session.completed === true;
  const hasRating = !!(session.ratings && session.ratings.length > 0);
  const rating = hasRating ? session.ratings![0]!.rating : null;

  const sessionEndedBySchedule = new Date(session.end_time) <= new Date();
  const sessionDoneForUi = isCompleted || sessionEndedBySchedule;
  const hasTutor = !!(session.tutor_id ?? session.tutor?.id);
  // Past tab only lists sessions the server already treats as past (ended, tutor-completed early, or
  // cancelled). Don’t gate the rating UI on client-side mirrors of completed/status — those fields
  // can lag; the server still validates on submit.
  const canRate =
    !hasRating && statusLower !== "cancelled" && hasTutor;

  const [summaryOpen, setSummaryOpen] = useState(false);

  const handleQuestClick = (prompt: string) => {
    router.push("/student/quest?prompt=" + encodeURIComponent(prompt));
  };

  return (
    <>
      <tr
        data-session-id={session.id}
        className="session-table-row border-b border-slate-200 bg-white hover:bg-slate-100/90 transition-colors [&_td]:text-slate-950"
      >
        <td className="py-3 pr-4 align-middle">
          <Badge
            variant="outline"
            className="text-[11px] font-mono font-semibold border-slate-500 text-slate-950 bg-slate-50"
          >
            {session.course}
          </Badge>
        </td>
        <td className="py-3 pr-4 align-middle">
          <div className="text-sm font-semibold text-slate-950">
            {session.tutor?.email?.split("@")[0] ?? "Tutor"}
          </div>
        </td>
        <td className="py-3 pr-4 align-middle">
          <div className="text-sm font-medium text-slate-900">{formatDate(session.start_time)}</div>
        </td>
        <td className="py-3 pr-4 align-middle">
          {hasRating ? (
            <div className="text-sm font-mono font-semibold text-slate-900 tabular-nums">{rating} / 5</div>
          ) : canRate ? (
            <div
              className="flex items-center gap-1 cursor-pointer select-none"
              role="button"
              tabIndex={0}
              onClick={() => setRatingDialogOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setRatingDialogOpen(true);
                }
              }}
              onMouseLeave={() => setHoveredStar(null)}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const active = hoveredStar != null ? star <= hoveredStar : false;
                return (
                  <span
                    key={star}
                    style={{
                      fontSize: 20,
                      cursor: "pointer",
                      color: active ? "#D97706" : "#64748B",
                      transition: "color 0.1s ease-out",
                    }}
                    onMouseEnter={() => setHoveredStar(star)}
                  >
                    *
                  </span>
                );
              })}
            </div>
          ) : statusLower === "cancelled" ? (
            <span className="text-xs font-medium text-slate-700">Cancelled</span>
          ) : (
            <span className="text-xs text-slate-600" title="Missing tutor on this session">
              Unavailable
            </span>
          )}
        </td>
        <td className="py-3 align-middle">
          {sessionDoneForUi ? (
            <button
              type="button"
              className="text-sm font-semibold text-mentrixa-700 hover:text-mentrixa-800 hover:underline"
              onClick={() => setSummaryOpen((o) => !o)}
            >
              {summaryOpen ? "Hide summary" : "View summary"}
            </button>
          ) : (
            <span className="text-xs text-slate-600">Pending completion</span>
          )}
        </td>
        <td className="py-3 align-middle text-right">
          <DeletePastSessionButton
            sessionId={session.id}
            endTime={session.end_time}
            allowRemoveBeforeScheduledEnd={
              isCompleted || session.status === "cancelled"
            }
          />
        </td>
      </tr>

      {isCompleted && summaryOpen && (
        <tr className="border-b border-slate-700 bg-slate-900/70">
          <td colSpan={6} className="p-0">
            <AISummaryPanel sessionId={session.id} onQuestClick={handleQuestClick} />
          </td>
        </tr>
      )}

      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="border border-slate-300 bg-white text-slate-900 shadow-xl dark:border-slate-300 dark:bg-white dark:text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Rate your session
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-700 leading-relaxed">
              Choose a star rating and optional note for your tutor.
            </DialogDescription>
          </DialogHeader>
          <RateSessionForm
            sessionId={session.id}
            canRate={canRate}
            onSuccess={() => {
              setRatingDialogOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function AISummaryPanel({
  sessionId,
  onQuestClick,
}: {
  sessionId: string;
  onQuestClick: (prompt: string) => void;
}) {
  const [packageData, setPackageData] = useState<SessionAiPackage | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "empty" | "error" | "generating">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const loadPackage = useCallback(() => {
    setPhase("loading");
    setErrorMessage(null);
    getSessionPackage(sessionId).then((result) => {
      if ("error" in result) {
        setPhase("error");
        setErrorMessage(result.error);
        setPackageData(null);
        return;
      }
      const pkg = result.package;
      if (!pkg) {
        setPackageData(null);
        setPhase("empty");
      } else {
        setPackageData(pkg);
        setPhase("ready");
      }
    });
  }, [sessionId]);

  useEffect(() => {
    loadPackage();
  }, [loadPackage]);

  useEffect(() => {
    if (panelRef.current && phase === "ready") {
      gsap.from(panelRef.current, {
        opacity: 0,
        y: 8,
        duration: 0.25,
        ease: "power2.out",
      });
    }
  }, [phase, sessionId]);

  const flashcards = packageData?.flashcards ?? [];

  const toggleCard = (index: number) => {
    setFlippedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  async function handleGenerate() {
    setPhase("generating");
    setErrorMessage(null);
    const res = await generateSessionPackage(sessionId);
    if ("error" in res) {
      setPhase("error");
      setErrorMessage(res.error);
      return;
    }
    setPackageData(res.package);
    setPhase("ready");
  }

  if (phase === "loading") {
    return (
      <div className="px-6 py-5">
        <span className="text-sm text-slate-200">Loading summary…</span>
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="px-6 py-5 space-y-3">
        <span className="text-sm text-slate-200">Generating your session summary…</span>
        <p className="text-xs text-slate-400 leading-relaxed">
          This usually takes under a minute. You can leave this open.
        </p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="px-6 py-5 space-y-3">
        <p className="text-sm font-medium text-red-200">{errorMessage ?? "Could not load summary."}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => loadPackage()}>
            Retry load
          </Button>
          <Button type="button" size="sm" onClick={() => void handleGenerate()}>
            Try generate
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="px-6 py-5 space-y-3">
        <p className="text-sm text-slate-200 leading-relaxed">
          No AI summary for this session yet. Generate one to see key points, flashcards, and
          follow-up practice.
        </p>
        <Button type="button" size="sm" onClick={() => void handleGenerate()}>
          Generate summary
        </Button>
      </div>
    );
  }

  if (!packageData) {
    return null;
  }

  const hasContent =
    !!packageData.summary?.trim() ||
    (packageData.key_points?.length ?? 0) > 0 ||
    (packageData.followup_quests?.length ?? 0) > 0 ||
    flashcards.length > 0;

  if (!hasContent) {
    return (
      <div className="px-6 py-5 space-y-3">
        <p className="text-sm text-slate-200">Summary was created but has no displayable content yet.</p>
        <Button type="button" size="sm" variant="outline" className="border-slate-500 text-slate-100" onClick={() => void handleGenerate()}>
          Regenerate
        </Button>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="px-6 py-5 space-y-4">
      {packageData.summary?.trim() && (
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em] mb-2">SUMMARY</p>
          <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
            {packageData.summary}
          </p>
        </div>
      )}

      {packageData.key_points && packageData.key_points.length > 0 && (
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em] mb-2">KEY POINTS</p>
          <div className="flex flex-wrap gap-2">
            {packageData.key_points.map((point, i) => (
              <span
                key={i}
                className="border border-slate-600 bg-slate-800/50 text-xs text-slate-100 px-2.5 py-1 rounded"
              >
                {point}
              </span>
            ))}
          </div>
        </div>
      )}

      {packageData.followup_quests && packageData.followup_quests.length > 0 && (
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em] mb-2">
            FOLLOW-UP QUESTS
          </p>
          <div className="space-y-1">
            {packageData.followup_quests.map((quest, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onQuestClick(quest.prompt)}
                className="block text-left text-sm text-sky-300 hover:text-sky-200 hover:underline"
              >
                {quest.prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {flashcards.length > 0 && (
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em] mb-2">FLASHCARDS</p>
          <div className="overflow-x-auto flex gap-3 pb-2 no-scrollbar">
            {flashcards.map((card, index) => {
              const isFlipped = !!flippedCards[index];
              return (
                <div
                  key={index}
                  className="w-40 h-24 border border-slate-600 rounded-lg cursor-pointer mentrixa-interactive overflow-hidden bg-slate-800/80"
                  onClick={() => toggleCard(index)}
                >
                  <div className="w-full h-full relative">
                    <div
                      className="absolute inset-0 p-3 text-xs leading-snug text-slate-100"
                      style={{ opacity: isFlipped ? 0 : 1 }}
                    >
                      {card.q}
                    </div>
                    <div
                      className="absolute inset-0 p-3 text-xs leading-snug text-slate-900 bg-emerald-50 border border-emerald-200"
                      style={{ opacity: isFlipped ? 1 : 0 }}
                    >
                      {card.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
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


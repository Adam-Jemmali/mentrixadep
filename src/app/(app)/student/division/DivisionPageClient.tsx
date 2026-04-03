"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type {
  LeaderboardEntry,
  DivisionStat,
  QuestHistoryEntry,
} from "@/app/actions/quest";
import type { LevelInfo } from "@/lib/levels";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DivisionIllustration } from "@/components/illustrations";
import { FocusDivisionPicker } from "./focus-division-picker";
import {
  getDivisionTheme,
  divisionTeaser,
} from "@/lib/division-ui";

gsap.registerPlugin(ScrollTrigger);

type SortKey = "xp" | "streak" | "level";

interface DivisionPageClientProps {
  divisionKey: string | null;
  divisionName: string | null;
  divisionDescription: string | null;
  focusedDivisionKey: string | null;
  divisionsCatalog: { key: string; name: string; description: string | null }[];
  learnersOnLeaderboard: number;
  xpByDivisionKey: Record<string, number>;
  rank: number | null;
  divisionXp: number | null;
  level: LevelInfo | null;
  leaderboard: LeaderboardEntry[];
  divisionStats: DivisionStat[];
  questHistory: QuestHistoryEntry[];
}

export function DivisionPageClient(props: DivisionPageClientProps) {
  const {
    divisionKey,
    divisionName,
    divisionDescription,
    focusedDivisionKey,
    divisionsCatalog,
    learnersOnLeaderboard,
    xpByDivisionKey,
    rank,
    divisionXp,
    level,
    leaderboard,
    divisionStats,
    questHistory,
  } = props;

  const [activeTab, setActiveTab] = useState<"leaderboard" | "my-divisions" | "history">(
    "leaderboard",
  );
  const [sortKey, setSortKey] = useState<SortKey>("xp");

  const tabContentRef = useRef<HTMLDivElement | null>(null);

  const sortedLeaderboard = useMemo(() => {
    const rows = [...leaderboard];
    rows.sort((a, b) => {
      if (sortKey === "xp") return b.divisionXp - a.divisionXp;
      if (sortKey === "streak") return b.streakDays - a.streakDays;
      // level: compare xpInTier + minXp as proxy
      const aBase = a.level.minXp + a.level.xpInTier;
      const bBase = b.level.minXp + b.level.xpInTier;
      return bBase - aBase;
    });
    return rows;
  }, [leaderboard, sortKey]);

  // Header countups
  useEffect(() => {
    const rankEl = document.querySelector<HTMLElement>("[data-division-stat='rank']");
    const xpEl = document.querySelector<HTMLElement>("[data-division-stat='xp']");
    const levelEl = document.querySelector<HTMLElement>("[data-division-stat='level']");

    if (rankEl && rank != null) {
      animateCount(rankEl, rank);
    }
    if (xpEl && divisionXp != null) {
      animateCount(xpEl, divisionXp);
    }
    if (levelEl && level) {
      // show total XP basis for level
      const total = level.minXp + level.xpInTier;
      animateCount(levelEl, total);
    }
  }, [rank, divisionXp, level]);

  // XP progress bar
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>("[data-user-xp-bar]");
    if (!bar || !level) return;
    const max = level.nextTierAt ?? level.minXp + 100;
    const ratio = Math.min(1, (level.minXp + level.xpInTier) / max);
    gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
    gsap.to(bar, {
      scaleX: ratio,
      duration: 1,
      ease: "power3.out",
      delay: 0.4,
    });
  }, [level]);

  // Scroll animations for leaderboard rows and mini XP bars
  useEffect(() => {
    if (activeTab !== "leaderboard") return;

    const rows = gsap.utils.toArray<HTMLTableRowElement>("[data-leaderboard-row]");
    if (rows.length) {
      gsap.fromTo(
        rows,
        { y: 4, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.25,
          stagger: 0.03,
          ease: "power2.out",
        },
      );
    }

    const bars = gsap.utils.toArray<HTMLDivElement>("[data-xp-bar-inner]");
    bars.forEach((bar) => {
      const maxWidth = Number(bar.dataset.widthPx ?? "60");
      gsap.fromTo(
        bar,
        { width: 0 },
        {
          width: maxWidth,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: bar,
            start: "top 80%",
          },
        },
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      const rowEls = gsap.utils.toArray<HTMLElement>("[data-leaderboard-row]");
      if (rowEls.length) {
        gsap.set(rowEls, { opacity: 1, y: 0, clearProps: "transform" });
      }
    };
  }, [activeTab, sortedLeaderboard]);

  // Tab content fade/slide on change
  const handleTabChange = (value: string) => {
    if (value !== "leaderboard" && value !== "my-divisions" && value !== "history") return;
    const nextTab = value as "leaderboard" | "my-divisions" | "history";
    // Radix Tabs can fire onValueChange during mount; avoid setState while a subtree
    // (e.g. division picker) is still rendering — same tab is a no-op.
    if (nextTab === activeTab) return;
    if (!tabContentRef.current) {
      setActiveTab(nextTab);
      return;
    }
    const el = tabContentRef.current;
    gsap.to(el, {
      opacity: 0,
      y: 4,
      duration: 0.15,
      onComplete: () => {
        setActiveTab(nextTab);
        requestAnimationFrame(() => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 4 },
            { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" },
          );
        });
      },
    });
  };

  const maxXpForProgress = level ? (level.nextTierAt ?? level.minXp + 100) : 100;
  const userTotalXp = level ? level.minXp + level.xpInTier : 0;

  const levelLabel = mapTierToLevelName(level?.tier);
  const headerTheme = divisionKey ? getDivisionTheme(divisionKey) : null;

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 relative">
      <DivisionIllustration />

      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 text-white mb-8 shadow-lg">
        <div
          className={`absolute inset-0 opacity-90 bg-gradient-to-br ${headerTheme?.gradient ?? "from-slate-800 via-slate-900 to-black"}`}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              Division arena
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
              Subject leaderboards that actually move you forward
            </h1>
            <p className="mt-2 text-sm text-white/85 leading-relaxed">
              Stack division XP from quests, climb ranks, then duel peers in the same
              subject—your home arena stays in sync everywhere.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              size="sm"
              className="bg-white text-slate-900 hover:bg-white/90 border-0"
              asChild
            >
              <Link href="/student/quest">Earn XP</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              asChild
            >
              <Link href="/student/duel">Skill duels</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Division header */}
      {divisionKey ? (
        <header className="border-b border-slate-200 pb-6 mb-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white shadow-md bg-gradient-to-br ${headerTheme?.gradient}`}
                aria-hidden
              >
                {headerTheme?.emoji}
              </span>
              <div>
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wide">
                  {divisionKey.replace(/-/g, " ")}
                </p>
                <h2 className="text-[26px] font-bold tracking-[-0.03em] text-slate-900">
                  {divisionName}
                </h2>
              </div>
            </div>
            <p className="text-sm text-slate-600 max-w-prose leading-relaxed">
              {divisionTeaser(
                divisionDescription,
                divisionName ?? divisionKey
              )}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {learnersOnLeaderboard} ranked learners on this board
            </p>
            {divisionsCatalog.length > 0 && (
              <FocusDivisionPicker
                focusedDivisionKey={focusedDivisionKey}
                divisionsCatalog={divisionsCatalog}
                currentDivisionKey={divisionKey}
                xpByKey={xpByDivisionKey}
              />
            )}
          </div>
          <div className="flex gap-8 shrink-0">
            <StatBlock label="#rank" dataAttr="rank" />
            <StatBlock label="division XP" dataAttr="xp" />
            <div className="text-right">
              <div
                data-division-stat="level"
                className={`text-xl font-bold font-mono ${levelColorClass(levelLabel)}`}
              >
                {levelLabel}
              </div>
              <div className="text-xs text-slate-400">level</div>
            </div>
          </div>
        </header>
      ) : (
        <header className="border-b border-slate-200 pb-6 mb-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Choose your home arena
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
              You haven&apos;t placed on a board yet—or you&apos;re using smart default without
              XP. Pick a subject below to lock your leaderboard, duel queue, and progress
              identity. Complete quests to climb.
            </p>
          </div>
          {divisionsCatalog.length > 0 && (
            <FocusDivisionPicker
              focusedDivisionKey={focusedDivisionKey}
              divisionsCatalog={divisionsCatalog}
              currentDivisionKey={null}
              xpByKey={xpByDivisionKey}
            />
          )}
        </header>
      )}

      {/* XP progress row */}
      {level && (
        <div className="mb-8 flex items-center gap-4">
          <p className="text-sm text-slate-400">Your progress</p>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              data-user-xp-bar
              className="w-full h-full bg-gradient-to-r from-blue-300  to-blue-300 origin-left"
            />
          </div>
          <p className="text-sm font-mono text-slate-400 text-right">
            {userTotalXp} / {maxXpForProgress} XP
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent p-0 mb-4 border-b border-slate-200 rounded-none h-auto">
          <TabsTrigger
            value="leaderboard"
            className="mr-6 rounded-none bg-transparent pb-2 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400 border-b-2 border-transparent hover:text-slate-900"
          >
            Leaderboard
          </TabsTrigger>
          <TabsTrigger
            value="my-divisions"
            className="mr-6 rounded-none bg-transparent pb-2 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400 border-b-2 border-transparent hover:text-slate-900"
          >
            My Divisions
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="mr-6 rounded-none bg-transparent pb-2 text-xs font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-slate-900 data-[state=inactive]:text-slate-400 border-b-2 border-transparent hover:text-slate-900"
          >
            Quest History
          </TabsTrigger>
        </TabsList>

        <div ref={tabContentRef}>
          <TabsContent value="leaderboard" className="mt-0">
            <LeaderboardTab
              rows={sortedLeaderboard}
              sortKey={sortKey}
              onSortChange={setSortKey}
              levelForScale={level}
            />
          </TabsContent>

          <TabsContent value="my-divisions" className="mt-0">
            <MyDivisionsTab
              divisions={divisionStats}
              onViewLeaderboard={() => handleTabChange("leaderboard")}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <QuestHistoryTab
              entries={questHistory}
              currentDivisionKey={divisionKey}
              currentDivisionName={divisionName}
            />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}

function StatBlock({ label, dataAttr }: { label: string; dataAttr: string }) {
  return (
    <div className="text-right">
      <div
        data-division-stat={dataAttr}
        className="text-xl font-bold font-mono text-slate-900"
      />
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function animateCount(el: HTMLElement, end: number) {
  const obj = { val: 0 };
  gsap.to(obj, {
    val: end,
    duration: 1.2,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = Math.round(obj.val).toString();
    },
  });
}

function mapTierToLevelName(tier?: LevelInfo["tier"]): string {
  if (!tier) return "Learner";
  if (tier === "bronze") return "Learner";
  if (tier === "silver") return "Scholar";
  if (tier === "gold") return "Expert";
  return "Master";
}

function levelColorClass(name: string): string {
  if (name === "Learner") return "text-slate-500";
  if (name === "Scholar") return "text-slate-600";
  if (name === "Expert") return "text-blue-700";
  if (name === "Master") return "text-cyan-700";
  return "text-slate-500";
}

function LeaderboardTab({
  rows,
  sortKey,
  onSortChange,
  levelForScale,
}: {
  rows: LeaderboardEntry[];
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  levelForScale: LevelInfo | null;
}) {
  const maxXp = levelForScale ? levelForScale.nextTierAt ?? levelForScale.minXp + 100 : 1000;

  const handleHeaderSort = (key: SortKey) => {
    onSortChange(key);
  };

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center gap-4 mb-3">
        <span className="text-xs text-slate-400 mr-1">Sort by:</span>
        {(["xp", "streak", "level"] as SortKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleHeaderSort(k)}
            className={
              sortKey === k
                ? "text-xs text-mentrixa-600 font-semibold underline underline-offset-2"
                : "text-xs text-slate-400 hover:text-slate-700"
            }
          >
            {k === "xp" ? "XP" : k === "streak" ? "Streak" : "Level"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="border-b border-slate-200 text-slate-400">
            <tr>
              <th className="py-2 pr-3 text-left cursor-pointer hover:text-slate-700">
                Rank
              </th>
              <th className="py-2 pr-3 text-left">Name</th>
              <th className="py-2 pr-3 text-left">Division XP</th>
              <th className="py-2 pr-3 text-left cursor-pointer hover:text-slate-700">
                Streak
              </th>
              <th className="py-2 text-left cursor-pointer hover:text-slate-700">
                Level
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const baseXp = row.level.minXp + row.level.xpInTier;
              const ratio = Math.min(1, baseXp / maxXp);
              const barWidth = 60 * ratio;
              const isCurrent = row.isCurrentUser;
              const rankBorderColor =
                row.rank === 1
                  ? "#B45309"
                  : row.rank === 2
                  ? "#94A3B8"
                  : row.rank === 3
                  ? "#C4773A"
                  : "transparent";

              return (
                <tr
                  key={row.userId}
                  data-leaderboard-row
                  className={`border-b border-slate-100 ${
                    isCurrent ? "bg-[#EFF6FF]" : "bg-white"
                  }`}
                  style={{ borderLeft: `3px solid ${rankBorderColor}` }}
                >
                  <td className="py-2 pr-3 align-middle">
                    {row.rank <= 3 ? (
                      <span
                        className="text-sm font-mono font-semibold"
                        style={{
                          color:
                            row.rank === 1
                              ? "#B45309"
                              : row.rank === 2
                              ? "#64748B"
                              : "#C4773A",
                        }}
                      >
                        {row.rank === 1 ? "1st" : row.rank === 2 ? "2nd" : "3rd"}
                      </span>
                    ) : (
                      <span className="text-sm font-mono font-semibold text-slate-400">
                        #{row.rank}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 align-middle">
                    <span
                      className={`text-sm font-medium ${
                        isCurrent ? "text-mentrixa-800" : "text-slate-900"
                      }`}
                    >
                      {row.displayName}
                      {isCurrent && (
                        <span className="ml-1 text-[11px] text-mentrixa-600">(you)</span>
                      )}
                    </span>
                  </td>
                  <td className="py-2 pr-3 align-middle">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-mono ${
                          isCurrent ? "text-mentrixa-800" : "text-slate-700"
                        }`}
                      >
                        {row.divisionXp}
                      </span>
                      <div className="relative w-[60px] h-[3px] bg-slate-100 rounded ml-2 overflow-hidden">
                        <div
                          data-xp-bar-inner
                          data-width-px={barWidth}
                          className="absolute left-0 top-0 h-full bg-mentrixa-600 rounded"
                          style={{ width: 0 }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-3 align-middle">
                    <span
                      className={`text-sm font-mono ${
                        isCurrent ? "text-mentrixa-700" : "text-slate-400"
                      }`}
                    >
                      {row.streakDays}d
                    </span>
                  </td>
                  <td className="py-2 align-middle">
                    <span className={`text-xs font-semibold ${levelColorClass(mapTierToLevelName(row.level.tier))}`}>
                      {mapTierToLevelName(row.level.tier)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MyDivisionsTab({
  divisions,
  onViewLeaderboard,
}: {
  divisions: DivisionStat[];
  onViewLeaderboard: () => void;
}) {
  if (!divisions.length) {
    return (
      <div className="border border-slate-200 rounded-lg p-8 text-sm text-slate-400">
        You don’t have XP in any division yet. Complete quests to unlock leaderboards.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead className="border-b border-slate-200 text-slate-400">
          <tr>
            <th className="py-2 pr-3 text-left">Division</th>
            <th className="py-2 pr-3 text-left">My XP</th>
            <th className="py-2 pr-3 text-left">Level</th>
            <th className="py-2 pr-3 text-left">Rank</th>
            <th className="py-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {divisions.map((d) => {
            const t = getDivisionTheme(d.divisionKey);
            return (
            <tr key={d.divisionKey} className="border-b border-slate-100 bg-white">
              <td className="py-2 pr-3 align-middle">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white bg-gradient-to-br ${t.gradient}`}
                    aria-hidden
                  >
                    {t.emoji}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {d.divisionName}
                  </span>
                </div>
              </td>
              <td className="py-2 pr-3 align-middle text-sm font-mono text-slate-700">
                {d.xp}
              </td>
              <td className="py-2 pr-3 align-middle text-xs font-semibold">
                <span className={levelColorClass(mapTierToLevelName(d.level.tier))}>
                  {mapTierToLevelName(d.level.tier)}
                </span>
              </td>
              <td className="py-2 pr-3 align-middle text-sm font-mono text-slate-400">
                #{d.rank}
              </td>
              <td className="py-2 align-middle">
                <button
                  type="button"
                  className="text-xs text-mentrixa-600 hover:underline"
                  onClick={onViewLeaderboard}
                >
                  View leaderboard
                </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QuestHistoryTab({
  entries,
  currentDivisionKey,
  currentDivisionName,
}: {
  entries: QuestHistoryEntry[];
  currentDivisionKey: string | null;
  currentDivisionName: string | null;
}) {
  const [scope, setScope] = useState<"arena" | "all">("arena");

  const filtered = useMemo(() => {
    if (scope === "all" || !currentDivisionKey) return entries;
    return entries.filter((e) => e.divisionKey === currentDivisionKey);
  }, [entries, scope, currentDivisionKey]);

  const formatWhen = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const goalLabel = (g: QuestHistoryEntry["goal"]) =>
    g === "exam" ? "Exam prep" : g === "interview" ? "Interview" : g === "assignment" ? "Assignment" : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-600 max-w-xl">
          Completed quests from the Quest lab. XP shown is what you earned for a correct graded
          answer. Subject comes from course mapping when the quest had a linked course; otherwise
          it appears as General.
        </p>
        {currentDivisionKey && (
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium shrink-0">
            <button
              type="button"
              onClick={() => setScope("arena")}
              className={
                scope === "arena"
                  ? "rounded-md bg-slate-900 text-white px-3 py-1.5"
                  : "rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-900"
              }
            >
              {currentDivisionName ?? "This arena"}
            </button>
            <button
              type="button"
              onClick={() => setScope("all")}
              className={
                scope === "all"
                  ? "rounded-md bg-slate-900 text-white px-3 py-1.5"
                  : "rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-900"
              }
            >
              All subjects
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="border border-slate-200 rounded-lg p-8 text-sm text-slate-500 bg-white">
          {entries.length === 0 ? (
            <>
              No completed quests yet. Finish a problem in the{" "}
              <Link href="/student/quest" className="text-mentrixa-600 hover:underline font-medium">
                Quest lab
              </Link>{" "}
              with a correct answer to see it here.
            </>
          ) : (
            <>
              Nothing in this filter. Try{" "}
              <button
                type="button"
                className="text-mentrixa-600 hover:underline font-medium"
                onClick={() => setScope("all")}
              >
                All subjects
              </button>{" "}
              or complete quests tied to this division.
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="py-2.5 px-4">When</th>
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-4">Goal</th>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-4">Question</th>
                <th className="py-2.5 px-4 text-right">XP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.questId} className="border-b border-slate-100 last:border-0 align-top">
                  <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {formatWhen(row.completedAt)}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-800">{row.divisionName}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">{goalLabel(row.goal)}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 capitalize">{row.mode ?? "—"}</td>
                  <td className="py-3 px-4 text-slate-700 max-w-md">
                    <p className="line-clamp-3 whitespace-pre-wrap">{row.promptPreview}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-emerald-700 whitespace-nowrap">
                    +{row.xpAwarded}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        <Link href="/student/quest" className="text-mentrixa-600 hover:underline">
          Open Quest lab
        </Link>
      </p>
    </div>
  );
}


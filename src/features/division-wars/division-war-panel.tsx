"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, AlertTriangle } from "lucide-react";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { createClient } from "@/shared/integrations/supabase/client";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import {
  formatWarTimeRemaining,
  warProgressPercent,
} from "@/features/division-wars/scoring-pure";
import { msUntilUtcDateEnd } from "@/features/divisions/division-week";
import type { DivisionWarPanelPayload } from "@/features/division-wars/types";
import { Button } from "@/shared/ui/button";

function useWarCountdown(weekEnd: string, active: boolean) {
  const [remaining, setRemaining] = useState(() =>
    active ? formatWarTimeRemaining(msUntilUtcDateEnd(weekEnd)) : "War ended",
  );

  useEffect(() => {
    if (!active) {
      setRemaining("War ended");
      return;
    }
    const tick = () => setRemaining(formatWarTimeRemaining(msUntilUtcDateEnd(weekEnd)));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [weekEnd, active]);

  return remaining;
}

export function DivisionWarPanel({
  initial,
  divisionKey,
}: {
  initial: DivisionWarPanelPayload;
  divisionKey: string;
}) {
  const [payload, setPayload] = useState(initial);
  const war = payload.war;

  useEffect(() => {
    setPayload(initial);
  }, [initial]);

  useEffect(() => {
    if (!war?.warId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`division-war:${war.warId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "division_war_contributions",
          filter: `war_id=eq.${war.warId}`,
        },
        () => {
          window.location.reload();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [war?.warId]);

  const isActive = war?.status === "active";
  const timeLabel = useWarCountdown(war?.weekEnd ?? "", Boolean(isActive));

  if (!war) return null;

  const barMy = warProgressPercent(war.sideA.totalAccuracyPoints, war.sideB.totalAccuracyPoints);
  const barOpp = 100 - barMy;

  const winnerName =
    war.winnerDivisionId === war.sideA.divisionId
      ? war.sideA.divisionName
      : war.winnerDivisionId === war.sideB.divisionId
        ? war.sideB.divisionName
        : null;

  return (
    <section className="space-y-4">
      {payload.showInactiveBanner ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div>
            <p className="text-sm font-bold text-amber-950">Your division needs you</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
              Complete quests this week — accuracy points win wars, not quest spam.
            </p>
            <Button asChild size="sm" className="mt-3 rounded-xl bg-amber-600 hover:bg-amber-500">
              <Link href="/student/quest">Start a quest</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className={cn(mentrixStudent.card, "overflow-hidden border border-indigo-100 p-6 sm:p-8")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MentrixaVocabIcon name="division-war" size={16} surface="light" title="Division war" />
              <p className={mentrixStudent.sectionEyebrowOnLight}>Division War</p>
            </div>
            <h2 className="text-xl font-black italic uppercase tracking-tight text-indigo-950">
              {war.sideA.divisionName}{" "}
              <span className="text-indigo-400">vs</span> {war.sideB.divisionName}
            </h2>
            <p className="text-sm text-slate-600">
              Scored by accuracy points — 5 quests at 90% beats 10 at 45%.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-indigo-900">
            <Clock className="h-4 w-4 text-indigo-600" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-widest">{timeLabel}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-8 space-y-3">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span className={cn(war.mySide === "a" && "text-indigo-700")}>
              {war.sideA.divisionName} · {war.sideA.totalAccuracyPoints.toLocaleString()} pts
            </span>
            <span className={cn(war.mySide === "b" && "text-indigo-700")}>
              {war.sideB.totalAccuracyPoints.toLocaleString()} pts · {war.sideB.divisionName}
            </span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${barMy}%` }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className="h-full bg-gradient-to-r from-slate-400 to-slate-500"
              initial={{ width: 0 }}
              animate={{ width: `${barOpp}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {payload.myContribution ? (
          <p className="mt-4 text-sm font-medium text-slate-700">
            Your contribution:{" "}
            <span className="font-black tabular-nums text-indigo-700">
              {payload.myContribution.accuracyPoints.toLocaleString()}
            </span>{" "}
            accuracy points this week ({payload.myContribution.questsCompleted} quests)
          </p>
        ) : null}

        {!isActive && winnerName ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            <MentrixaVocabIcon name="league" size={16} surface="light" title="League" />
            <span className="text-sm font-bold">{winnerName} won this war</span>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <ContributorColumn
            title={war.sideA.divisionName}
            highlight={war.mySide === "a"}
            rows={war.sideA.topContributors}
          />
          <ContributorColumn
            title={war.sideB.divisionName}
            highlight={war.mySide === "b"}
            rows={war.sideB.topContributors}
          />
        </div>

        {isActive ? (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-indigo-50 pt-6">
            <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-500">
              <Link href="/student/quest">Earn accuracy points</Link>
            </Button>
            {divisionKey !== war.sideA.divisionKey && divisionKey !== war.sideB.divisionKey ? null : (
              <Button asChild variant="outline" className="rounded-xl border-indigo-200 text-indigo-900">
                <Link href={`/student/division/${encodeURIComponent(divisionKey)}`}>Division hub</Link>
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ContributorColumn({
  title,
  highlight,
  rows,
}: {
  title: string;
  highlight: boolean;
  rows: { studentId: string; displayName: string; accuracyPoints: number; questsCompleted: number }[];
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        highlight ? "border-indigo-200 bg-indigo-50/40" : "border-slate-100 bg-slate-50/50",
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
      <ul className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <li className="text-xs italic text-slate-400">No contributions yet</li>
        ) : (
          rows.map((r, i) => (
            <li key={r.studentId} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium text-slate-800">
                <span className="mr-2 font-black tabular-nums text-indigo-500">{i + 1}</span>
                {r.displayName}
              </span>
              <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-indigo-700">
                {r.accuracyPoints.toLocaleString()}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

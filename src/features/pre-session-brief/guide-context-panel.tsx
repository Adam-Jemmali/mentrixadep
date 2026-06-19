"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { formatDateInZone, formatTimeRangeInZone } from "@/shared/core/time-format";
import { getPreSessionContext } from "@/features/pre-session-brief/context";
import { isPreSessionContextWindowOpen } from "@/features/pre-session-brief/context-pure";
import type { PreSessionContext } from "@/features/pre-session-brief/types";
import { formatSessionFocusSignal } from "@/features/analytics/utils/biometric-friction";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { formatVerifiedGapLine } from "@/features/pre-session-brief/verified-gaps";

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "0";
}

export function GuidePreSessionContextPanel({
  sessionId,
  guideId,
  course,
  startTime,
  endTime,
  studentName,
  displayTimeZone = "UTC",
}: {
  sessionId: string;
  guideId: string;
  course: string;
  startTime: string;
  endTime: string;
  studentName: string;
  displayTimeZone?: string;
}) {
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<PreSessionContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const windowOpen = isPreSessionContextWindowOpen(startTime);

  function toggle() {
    if (!windowOpen) return;
    if (open) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      setError(null);
      try {
        const data = await getPreSessionContext(sessionId, guideId);
        if (!data) {
          setError("Could not load student context.");
          return;
        }
        setCtx(data);
        setOpen(true);
      } catch {
        setError("Could not load student context.");
      }
    });
  }

  return (
    <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-xs text-slate-700">
          <span className="font-semibold text-slate-900">{studentName}</span>
          <span className="mx-1.5 text-slate-400">·</span>
          {course}
          <span className="mx-1.5 text-slate-400">·</span>
          {formatDateInZone(startTime, displayTimeZone)}{" "}
          {formatTimeRangeInZone(startTime, endTime, displayTimeZone)}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-[11px]"
          disabled={!windowOpen || pending}
          onClick={toggle}
        >
          {pending ? "Loading…" : open ? "Hide context" : "View student context"}
        </Button>
      </div>
      {!windowOpen ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Student context unlocks 2 hours before the session.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-[11px] text-red-600">{error}</p> : null}
      {open && ctx ? <GuidePreSessionContextBody context={ctx} /> : null}
    </div>
  );
}

export function GuidePreSessionContextBody({ context }: { context: PreSessionContext }) {
  const p = context.performance;
  const trend = signed(p.questAccuracyTrendDelta);

  return (
    <div className="mt-3 space-y-4 border-t border-indigo-100 pt-3 text-sm">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">
          Student performance summary
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
          <li>
            Quest accuracy in {context.subject} (last 30 days):{" "}
            <strong>{p.questAccuracyLast30Days}%</strong>
            <span className="text-slate-500"> · Trend: {trend}% vs previous 30 days</span>
          </li>
          {p.weakestConcepts.length > 0 ? (
            <li>
              <span className="font-medium">Weakest concepts:</span>
              <ol className="mt-1 list-decimal pl-4">
                {p.weakestConcepts.map((c) => (
                  <li key={c.label}>
                    {c.label}: {c.accuracyPercent}% accuracy
                  </li>
                ))}
              </ol>
            </li>
          ) : null}
          <li>
            Duel record in {context.subject}:{" "}
            <strong>
              {p.duelWins}-{p.duelLosses}
            </strong>{" "}
            this month
          </li>
          <li>
            Current rank: <strong>{p.currentRankTitle}</strong>
            {p.divisionPosition != null ? (
              <span>
                {" "}
                · Division position: <strong>#{p.divisionPosition}</strong>
              </span>
            ) : null}
          </li>
          {p.lastSessionTopic ? (
            <li>
              Last session topic: <strong>{p.lastSessionTopic}</strong>
            </li>
          ) : null}
        </ul>
      </div>

      {isApCalculusAbSubject(context.subject) && context.verifiedGaps ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">
            Verified gaps
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
            {context.verifiedGaps.nodes.map((gap) => (
              <li key={`${gap.unitName}-${gap.nodeName}`}>{formatVerifiedGapLine(gap)}</li>
            ))}
            {context.verifiedGaps.sessionFocusSignal != null ? (
              <li>{formatSessionFocusSignal(context.verifiedGaps.sessionFocusSignal)}</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {context.aiBrief ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">AI brief</p>
          <div className="mt-2 space-y-2 text-xs text-slate-700">
            {context.aiBrief.likelyCoverage.length > 0 ? (
              <div>
                <p className="font-medium">Likely topics to cover</p>
                <ul className="mt-1 list-disc pl-4">
                  {context.aiBrief.likelyCoverage.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {context.aiBrief.warmUpExercise.prompt ? (
              <div>
                <p className="font-medium">Suggested warm-up</p>
                <p className="mt-1 text-slate-600">{context.aiBrief.warmUpExercise.prompt}</p>
              </div>
            ) : null}
            {context.aiBrief.questionsToAsk.length > 0 ? (
              <div>
                <p className="font-medium">Questions the student should ask</p>
                <ul className="mt-1 list-disc pl-4">
                  {context.aiBrief.questionsToAsk.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">AI brief generates about 2 hours before the session.</p>
      )}

      {context.breakthrough ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950">
          <p className="font-bold uppercase tracking-wide text-emerald-800">Breakthrough potential</p>
          <p className="mt-1">{context.breakthrough.message}</p>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { formatDateInZone, formatTimeRangeInZone } from "@/shared/core/time-format";
import { getPreSessionContext } from "@/features/pre-session-brief/context";
import { isPreSessionContextWindowOpen } from "@/features/pre-session-brief/context-pure";
import type { PreSessionContext } from "@/features/pre-session-brief/types";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import { MentrixaDrawer } from "@/shared/ui/drawer-patterns";
import { guideMasteryGridDrawerMessage } from "@/shared/ui/drawer-messages-pure";

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
  const masteryCopy = guideMasteryGridDrawerMessage(studentName, course);

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
          setError("Could not load student mastery grid.");
          return;
        }
        setCtx(data);
        setOpen(true);
      } catch {
        setError("Could not load student mastery grid.");
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
          {pending ? "Loading…" : open ? "Hide mastery grid" : "View mastery grid"}
        </Button>
      </div>
      {!windowOpen ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Student mastery grid unlocks 2 hours before the session.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-[11px] text-red-600">{error}</p> : null}
      {open && ctx ? (
        <div className="mt-3 hidden border-t border-indigo-100 pt-3 lg:block">
          <GuidePreSessionContextBody context={ctx} />
        </div>
      ) : null}
      {ctx ? (
        <div className="lg:hidden">
          <MentrixaDrawer
            isOpen={open}
            onOpenChange={setOpen}
            placement="bottom"
            tone="light"
            brandKind="guide"
            title={masteryCopy.title}
            description={masteryCopy.description}
            bodyClassName="p-0"
          >
            <div className="p-4">
              <GuidePreSessionContextBody context={ctx} embedded />
              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                {masteryCopy.verdict} {masteryCopy.nextAction}
              </p>
            </div>
          </MentrixaDrawer>
        </div>
      ) : null}
    </div>
  );
}

export function GuidePreSessionContextBody({
  context,
  embedded = false,
}: {
  context: PreSessionContext;
  embedded?: boolean;
}) {
  const shellClass = embedded ? "" : "mt-3 border-t border-indigo-100 pt-3";

  if (!isApCalculusAbSubject(context.subject) || !context.masteryGrid) {
    return (
      <p className={`${shellClass} text-xs text-slate-600`}>
        Mastery grid is not available for this subject yet.
      </p>
    );
  }

  return (
    <div className={shellClass}>
      <MasteryGrid
        data={context.masteryGrid}
        showLegend
        readOnly
        pinnedNodeIds={context.sessionTargetNodeIds}
        remainderCollapsed
      />
    </div>
  );
}

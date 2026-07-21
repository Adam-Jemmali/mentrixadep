"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { formatDateInZone, formatTimeRangeInZone } from "@/shared/core/time-format";
import { getPreSessionContext } from "@/features/pre-session-brief/context";
import { isPreSessionContextWindowOpen } from "@/features/pre-session-brief/context-pure";
import type { PreSessionContext } from "@/features/pre-session-brief/types";
import { MentrixaDrawer } from "@/shared/ui/drawer-patterns";
import { guideMasteryGridDrawerMessage } from "@/shared/ui/drawer-messages-pure";
import { GuideContextClient } from "@/features/pre-session-brief/guide-context-client";
import { GuideAnimatedSticky } from "@/features/tutor/ui/guide-animated-sticky";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

export function GuidePreSessionContextPanel({
  sessionId,
  guideId,
  course,
  startTime,
  endTime,
  studentName,
  studentId: _studentId,
  displayTimeZone = "UTC",
}: {
  sessionId: string;
  guideId: string;
  course: string;
  startTime: string;
  endTime: string;
  studentName: string;
  studentId?: string;
  displayTimeZone?: string;
}) {
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<PreSessionContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const windowOpen = isPreSessionContextWindowOpen(startTime);
  const drawerCopy = guideMasteryGridDrawerMessage(studentName, course);

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
    <GuideAnimatedSticky variant="curl" compact staggerIndex={0}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
              <MentrixaVocabIcon name="guide-session" size={16} surface="light" title="Session" />
              {studentName}
            </span>
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
            {pending ? "Loading" : open ? "Hide context" : "Open context"}
          </Button>
        </div>

        {!windowOpen ? (
          <p className="text-[11px] text-slate-500">
            Student context unlocks 30 minutes before the session.
          </p>
        ) : null}

        {error ? <p className="text-[11px] text-red-600">{error}</p> : null}

        {open ? (
          <div className="hidden border-t border-[#E2E8F0] pt-3 lg:block">
            <GuideContextClient context={ctx} loading={pending} />
          </div>
        ) : null}

        <div className="lg:hidden">
          <MentrixaDrawer
            isOpen={open}
            onOpenChange={setOpen}
            placement="bottom"
            tone="light"
            brandKind="guide"
            title={drawerCopy.title}
            description={drawerCopy.description}
            bodyClassName="max-h-[78vh] overflow-y-auto p-4"
          >
            <GuideContextClient context={ctx} loading={pending} />
          </MentrixaDrawer>
        </div>
      </div>
    </GuideAnimatedSticky>
  );
}

/** @deprecated Use GuideContextClient */
export function GuidePreSessionContextBody({
  context,
}: {
  context: PreSessionContext;
  embedded?: boolean;
}) {
  return <GuideContextClient context={context} />;
}

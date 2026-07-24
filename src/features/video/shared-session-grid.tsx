"use client";

import { useCallback, useMemo, useState, type ComponentProps } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { LayoutGrid, X } from "lucide-react";
import { animate } from "@/shared/animation/anime";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "@/shared/animation/motion";
import { cn } from "@/shared/core/utils";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import type { MasteryGridNode } from "@/features/mastery-grid/types";
import { GuideAnimatedSticky } from "@/features/tutor/ui/guide-animated-sticky";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { BklitShimmer } from "@/shared/ui/bklit-shimmer";
import { MentrixaDrawer } from "@/shared/ui/drawer-patterns";
import { GuideSessionAnnotationToolbar } from "@/features/video/guide-session-annotation-toolbar";
import type { SharedSessionGridPayload } from "@/features/video/load-shared-session-grid";
import {
  mergePinnedAndFlaggedNodes,
  sharedSessionGridVerdict,
  type SharedSessionGridMode,
} from "@/features/video/shared-session-grid-pure";
import { useSharedSessionGridRealtime } from "@/features/video/use-shared-session-grid-realtime";

const SESSION_PINNED_RING =
  "ring-2 ring-[var(--mx-violet)]/90 ring-offset-1 ring-offset-[#FAFAF8]";

export function SharedSessionGridPanel({
  open,
  onOpenChange,
  mode,
  sessionId,
  guideName,
  payload,
  channel,
  isMobile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SharedSessionGridMode;
  sessionId: string;
  guideName: string;
  payload: SharedSessionGridPayload;
  channel: RealtimeChannel | null;
  isMobile: boolean;
}) {
  const reduceMotion = useReducedMotion();

  const onBloomElement = useCallback(
    (nodeId: string) => {
      if (reduceMotion) return;
      const el = document.querySelector<HTMLElement>(`[data-skill-node-id="${nodeId}"]`);
      if (!el) return;
      void animate(el, {
        scale: [1, 1.35, 1],
        duration: 520,
        ease: "outElastic(1, .6)",
      });
    },
    [reduceMotion],
  );

  const realtime = useSharedSessionGridRealtime({
    mode,
    studentId: payload.studentId,
    initialGrid: payload.masteryGrid,
    channel,
    guideName,
    onBloomElement,
  });

  const pinnedNodeIds = useMemo(
    () =>
      mergePinnedAndFlaggedNodes(
        payload.sessionTargetNodeIds,
        [...realtime.flaggedNodeIds],
      ),
    [payload.sessionTargetNodeIds, realtime.flaggedNodeIds],
  );

  const copy = sharedSessionGridVerdict(
    mode,
    payload.sessionTargetNodeIds.length,
    realtime.flaggedNodeIds.size,
  );

  const [hoveredNode, setHoveredNode] = useState<{
    node: MasteryGridNode;
    rect: DOMRect;
  } | null>(null);

  const handleNodeEnter = useCallback((node: MasteryGridNode, element: HTMLElement) => {
    if (mode !== "guide") return;
    setHoveredNode({ node, rect: element.getBoundingClientRect() });
  }, [mode]);

  const handleNodeLeave = useCallback(() => {
    if (mode !== "guide") return;
    window.setTimeout(() => setHoveredNode(null), 160);
  }, [mode]);

  const gridBody = (
    <SharedSessionGridBody
      mode={mode}
      sessionId={sessionId}
      payload={payload}
      pinnedNodeIds={pinnedNodeIds}
      copy={copy}
      realtime={realtime}
      hoveredNode={hoveredNode}
      onNodeEnter={handleNodeEnter}
      onNodeLeave={handleNodeLeave}
      onToolbarClose={() => setHoveredNode(null)}
    />
  );

  return (
    <>
      {isMobile ? (
        <MentrixaDrawer
          isOpen={open}
          onOpenChange={onOpenChange}
          placement="bottom"
          tone="dark"
          brandKind="guide"
          title="Shared mastery grid"
          description={copy.verdict}
          showHandle
          bodyClassName="max-h-[72vh] overflow-y-auto pb-6"
        >
          {open ? gridBody : null}
        </MentrixaDrawer>
      ) : (
        <motion.aside
          layout
          initial={false}
          animate={{
            width: open ? 360 : 0,
            opacity: open ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="relative flex-none overflow-hidden border-l border-white/8 bg-[var(--mx-navy)]/95"
          aria-hidden={!open}
        >
          <div className="flex h-full w-[360px] flex-col">
            <header className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2.5">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#C4B5FD]">
                  <MentrixaVocabIcon name="mastery-grid" size={16} surface="dark" title="Grid" />
                  Shared grid
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-white/55">{copy.verdict}</p>
              </div>
              <button
                type="button"
                aria-label="Close shared grid"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/50 transition hover:border-white/25 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-3">{gridBody}</div>
            <footer className="border-t border-white/8 px-3 py-2 text-[10px] text-white/45">
              {copy.nextAction}
            </footer>
          </div>
        </motion.aside>
      )}
    </>
  );
}

function SharedSessionGridBody({
  mode,
  sessionId,
  payload,
  pinnedNodeIds,
  copy,
  realtime,
  hoveredNode,
  onNodeEnter,
  onNodeLeave,
  onToolbarClose,
}: {
  mode: SharedSessionGridMode;
  sessionId: string;
  payload: SharedSessionGridPayload;
  pinnedNodeIds: string[];
  copy: { verdict: string; nextAction: string };
  realtime: ReturnType<typeof useSharedSessionGridRealtime>;
  hoveredNode: { node: MasteryGridNode; rect: DOMRect } | null;
  onNodeEnter: (node: MasteryGridNode, element: HTMLElement) => void;
  onNodeLeave: () => void;
  onToolbarClose: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative space-y-3">
      <GuideAnimatedSticky variant="taped" compact staggerIndex={0}>
        <div className="space-y-1.5">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--mx-indigo)]">
            <MentrixaVocabIcon name="guide-session" size={16} surface="light" title="Session" />
            Live session grid
          </p>
          <p className="text-xs font-semibold leading-snug text-[var(--mx-navy)]">{copy.verdict}</p>
          <p className="text-[11px] leading-snug text-[#64748B]">{copy.nextAction}</p>
        </div>
      </GuideAnimatedSticky>

      {!realtime.grid ? (
        <BklitShimmer className="h-48 w-full rounded-xl" />
      ) : (
        <MasteryGrid
          data={realtime.grid}
          compact={false}
          hideNextAction
          readOnly
          sessionInteractive={mode === "guide"}
          showLegend
          remainderCollapsed
          pinnedNodeIds={pinnedNodeIds}
          flaggedNodeIds={realtime.flaggedNodeIds}
          pinnedRingClassName={SESSION_PINNED_RING}
          highlightTransition={realtime.highlightTransition ?? undefined}
          className="shadow-none"
          onNodePointerEnter={onNodeEnter}
          onNodePointerLeave={onNodeLeave}
        />
      )}

      <SessionGridToasts
        guideNote={realtime.guideNoteToast}
        practiceAssigned={realtime.practiceAssignedToast}
        reduceMotion={reduceMotion}
      />

      {mode === "guide" && hoveredNode ? (
        <GuideSessionAnnotationToolbar
          node={hoveredNode.node}
          anchorRect={hoveredNode.rect}
          sessionId={sessionId}
          studentId={payload.studentId}
          guideName={realtime.guideName}
          isFlagged={realtime.flaggedNodeIds.has(hoveredNode.node.id)}
          impactScore={payload.guideImpactByNodeId[hoveredNode.node.id]}
          impactPulsing={realtime.pulsingImpactNodeId === hoveredNode.node.id}
          onFlag={realtime.broadcastFlag}
          onNoteSent={realtime.broadcastNote}
          onPracticeAssigned={realtime.broadcastPracticeAssigned}
          onClose={onToolbarClose}
        />
      ) : null}
    </div>
  );
}

function SessionGridToasts({
  guideNote,
  practiceAssigned,
  reduceMotion,
}: {
  guideNote: {
    nodeName: string;
    note: string;
    guideName: string;
  } | null;
  practiceAssigned: { nodeName: string; questId: string } | null;
  reduceMotion: boolean | null;
}) {
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[90] w-[min(92vw,22rem)] -translate-x-1/2 space-y-2">
      <AnimatePresence initial={false}>
        {guideNote ? (
          <motion.div
            key="guide-note"
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="pointer-events-auto rounded-xl border border-[var(--mx-violet)]/35 bg-[var(--mx-navy-2)]/95 px-3 py-2.5 shadow-[0_16px_40px_-12px_rgba(124,58,237,0.55)] backdrop-blur-md"
          >
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#C4B5FD]">
              <MentrixaVocabIcon name="guide-session" size={14} surface="dark" title="Guide note" />
              {guideNote.guideName} on {guideNote.nodeName}
            </p>
            <p className="mt-1 text-xs leading-snug text-white/85">{guideNote.note}</p>
          </motion.div>
        ) : null}

        {practiceAssigned ? (
          <motion.div
            key="practice-assigned"
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="pointer-events-auto rounded-xl border border-[var(--mx-indigo)]/35 bg-[var(--mx-navy-2)]/95 px-3 py-2.5 shadow-lg backdrop-blur-md"
          >
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#A5B4FC]">
              <MentrixaVocabIcon name="practice-pack" size={14} surface="dark" title="Practice" />
              Next pack queued
            </p>
            <p className="mt-1 text-xs text-white/85">
              Your Guide assigned a verified pack on {practiceAssigned.nodeName}.
            </p>
            <Link
              href={`/student/quest?questId=${practiceAssigned.questId}`}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#C4B5FD] hover:text-white"
            >
              Open practice pack
              <MentrixaVocabIcon name="practice-pack" size={12} surface="dark" title="Open" />
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SharedSessionGridToggle({
  active,
  onClick,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Shared mastery grid"
      aria-label="Shared mastery grid"
      className={cn(
        "relative h-9 w-9 flex items-center justify-center rounded-md border bg-transparent active:scale-95 transition-all duration-150",
        active
          ? "border-[var(--mx-violet)]/50 text-[#C4B5FD]"
          : "border-white/15 text-white/50 hover:border-white/30 hover:text-white",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <LayoutGrid size={14} strokeWidth={2} />
    </button>
  );
}

export function SharedSessionGrid(props: ComponentProps<typeof SharedSessionGridPanel>) {
  return <SharedSessionGridPanel {...props} />;
}

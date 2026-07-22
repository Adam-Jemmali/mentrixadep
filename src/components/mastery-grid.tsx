"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createTimeline, stagger } from "@/shared/animation/anime";
import { useReducedMotion } from "@/shared/animation/motion";
import { Button } from "@/shared/ui/button";
import { BklitShimmer, BklitShimmerGrid } from "@/shared/ui/bklit-shimmer";
import { MasteryNode } from "@/components/mastery-node";
import { cn } from "@/shared/core/utils";
import type { MasteryGridFetchMode } from "@/features/mastery-grid/get-mastery-grid-action";
import {
  countMasteryGridSkills,
  masteryGridVerdictSentence,
  toMasteryNodeVisualState,
} from "@/features/mastery-grid/mastery-grid-pure";
import { useMasteryGridData } from "@/features/mastery-grid/use-mastery-grid-cache";
import type { MasteryGridData, MasteryGridNode } from "@/features/mastery-grid/types";

export type MasteryGridMode = MasteryGridFetchMode;

export type MasteryGridProps = {
  userId: string;
  subject: string;
  mode: MasteryGridMode;
  pinnedNodeIds?: string[];
  onNodePress?: (nodeId: string) => void;
  compact?: boolean;
  /** When false, hides the verdict line under the grid (e.g. student home hero owns verdict). */
  showVerdict?: boolean;
  /** Skip first fetch when parent already loaded grid data (e.g. public rank RSC). */
  initialData?: MasteryGridData;
  /** Light paper for rank passport inner pages. */
  surface?: "dark" | "light";
  /** Full grid scroll inside passport book page. */
  passportScroll?: boolean;
  /** Flat passport page: no nested scroll, no expand control. */
  passportPage?: boolean;
  className?: string;
};

function MasteryGridLoading({ className }: { className?: string }) {
  return (
    <section className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading mastery grid">
      {Array.from({ length: 2 }).map((_, unitIndex) => (
        <div key={unitIndex} className="space-y-2">
          <BklitShimmer className="h-2.5 w-20 rounded" />
          <BklitShimmerGrid count={10} />
        </div>
      ))}
      <BklitShimmer className="mt-2 h-4 w-full max-w-md rounded" aria-label="Loading verdict" />
    </section>
  );
}

function MasteryGridUnit({
  unitName,
  nodes,
  pinnedNodeIds,
  onNodePress,
  unitLabelRef,
  registerNodeRef,
  nodeOffset,
}: {
  unitName: string;
  nodes: MasteryGridNode[];
  pinnedNodeIds: Set<string>;
  onNodePress?: (nodeId: string) => void;
  unitLabelRef: (el: HTMLParagraphElement | null) => void;
  registerNodeRef: (index: number, el: HTMLDivElement | null) => void;
  nodeOffset: number;
}) {
  return (
    <section className="space-y-2">
      <p
        ref={unitLabelRef}
        className="mx-grid-unit-label font-medium uppercase tracking-[0.14em] text-[var(--mx-muted)] opacity-0"
        style={{ fontSize: 10 }}
      >
        {unitName}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {nodes.map((node, nodeIndex) => {
          const pinned = pinnedNodeIds.has(node.id);
          const globalIndex = nodeOffset + nodeIndex;

          return (
            <div
              key={node.id}
              ref={(el) => registerNodeRef(globalIndex, el)}
              className={cn(
                "mx-grid-node-shell opacity-0",
                pinned && "rounded-[var(--radius-node)] border-l-2 border-[var(--mx-primary)] pl-1",
              )}
            >
              <MasteryNode
                nodeId={node.id}
                state={toMasteryNodeVisualState(node)}
                nodeName={node.nodeName}
                accuracy={node.accuracyPercent ?? undefined}
                size="sm"
                showGlow={node.state === "verified"}
                onPress={onNodePress ? () => onNodePress(node.id) : undefined}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MasteryGrid({
  userId,
  subject,
  mode,
  pinnedNodeIds = [],
  onNodePress,
  compact = false,
  showVerdict = true,
  initialData,
  surface = "dark",
  passportScroll = false,
  passportPage = false,
  className,
}: MasteryGridProps) {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(!compact || passportScroll || passportPage);
  const hasAnimatedRef = useRef(false);

  const unitLabelRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const verdictRef = useRef<HTMLParagraphElement>(null);

  const pinnedSet = useMemo(() => new Set(pinnedNodeIds), [pinnedNodeIds]);

  const { data, error, isLoading } = useMasteryGridData({
    userId,
    subject,
    mode,
    initialData,
  });

  const visibleUnits = useMemo(() => {
    if (!data) return [];
    if (passportScroll) return data.units;
    if (passportPage) return data.units.slice(0, 3);
    return expanded ? data.units : data.units.slice(0, 2);
  }, [data, expanded, passportPage, passportScroll]);

  const totalSkills = data ? countMasteryGridSkills(data) : 0;
  const verdictLine = data ? masteryGridVerdictSentence(data) : "";
  const hiddenUnitCount =
    data && compact && !expanded && !passportScroll && !passportPage ? Math.max(0, data.units.length - 2) : 0;
  const verdictTextClass =
    surface === "light"
      ? "font-[family-name:var(--font-playfair),serif] text-base italic leading-snug text-[#0B1220] opacity-0"
      : "font-[family-name:var(--font-playfair),serif] text-base italic leading-snug text-white opacity-0";
  const errorShellClass =
    surface === "light"
      ? "rounded-[var(--radius-card)] border border-[#C4B5FD] bg-white/90 p-4"
      : "rounded-[var(--radius-card)] border border-white/10 bg-[var(--mx-surface-2)] p-4";

  useEffect(() => {
    if (!data || reduceMotion || hasAnimatedRef.current) return;

    const labels = unitLabelRefs.current.filter(Boolean) as HTMLParagraphElement[];
    const nodes = nodeRefs.current.filter(Boolean) as HTMLDivElement[];
    const verdict = verdictRef.current;
    if (labels.length === 0 && nodes.length === 0) return;

    const timeline = createTimeline({ autoplay: false });

    if (labels.length > 0) {
      timeline.add(labels, {
        opacity: [0, 1],
        y: [8, 0],
        duration: 300,
        ease: "outQuart",
        delay: stagger(80),
      });
    }

    if (nodes.length > 0) {
      timeline.add(
        nodes,
        {
          scale: [0.7, 1],
          opacity: [0, 1],
          duration: 400,
          ease: "outBack",
          delay: stagger(18),
        },
        "-=200",
      );
    }

    if (showVerdict && verdict) {
      timeline.add(
        verdict,
        {
          opacity: [0, 1],
          x: [-12, 0],
          duration: 400,
          ease: "outQuart",
        },
      );
    }

    timeline.play();
    hasAnimatedRef.current = true;

    return () => {
      timeline.revert();
    };
  }, [data, reduceMotion, showVerdict]);

  useEffect(() => {
    if (!reduceMotion || !data) return;
    for (const label of unitLabelRefs.current) {
      if (label) label.style.opacity = "1";
    }
    for (const node of nodeRefs.current) {
      if (node) {
        node.style.opacity = "1";
        node.style.transform = "none";
      }
    }
    if (verdictRef.current) {
      verdictRef.current.style.opacity = "1";
      verdictRef.current.style.transform = "none";
    }
  }, [data, reduceMotion]);

  if (isLoading && !data) {
    return <MasteryGridLoading className={className} />;
  }

  if (error || !data) {
    return (
      <section className={cn(errorShellClass, className)}>
        <p className="text-sm text-[var(--mx-muted)]">
          The mastery grid did not load. Refresh the page or try again in a moment.
        </p>
      </section>
    );
  }

  let nodeOffset = 0;

  return (
    <section className={cn("space-y-3", className)} data-mastery-grid-mode={mode}>
      <div
        className={cn(
          passportScroll ? "max-h-[min(26rem,52vh)] space-y-3 overflow-y-auto overscroll-y-contain pr-1" : "space-y-3",
          !passportScroll && !passportPage && compact && !expanded && "max-h-[320px] space-y-3 overflow-hidden",
          !passportScroll && !passportPage && expanded && compact && "max-h-[320px] space-y-3 overflow-y-auto",
          passportPage && "space-y-2 overflow-hidden",
        )}
      >
        {visibleUnits.map((unit, unitIndex) => {
          const offset = nodeOffset;
          nodeOffset += unit.nodes.length;

          return (
            <MasteryGridUnit
              key={`${unit.unitNumber}-${unit.unitName}`}
              unitName={unit.unitName}
              nodes={unit.nodes}
              pinnedNodeIds={pinnedSet}
              onNodePress={onNodePress}
              unitLabelRef={(el) => {
                unitLabelRefs.current[unitIndex] = el;
              }}
              registerNodeRef={(index, el) => {
                nodeRefs.current[offset + index] = el;
              }}
              nodeOffset={offset}
            />
          );
        })}
      </div>

      {compact && hiddenUnitCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto px-0 text-sm font-semibold text-[var(--mx-indigo)] hover:bg-transparent hover:text-[var(--mx-primary)]"
          onClick={() => setExpanded(true)}
        >
          {`Show all ${totalSkills} skills`}
        </Button>
      ) : null}

      {showVerdict ? (
      <blockquote
        className="border-l border-[var(--mx-primary)] pl-3"
        aria-live="polite"
      >
        <p
          ref={verdictRef}
          className={verdictTextClass}
        >
          {verdictLine}
        </p>
      </blockquote>
      ) : null}
    </section>
  );
}

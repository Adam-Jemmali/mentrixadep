"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { MasteryGridData, MasteryGridNode, MasteryNodeState } from "@/features/mastery-grid/types";
import { splitMasteryGridByPinned, VERIFIED_GOLD } from "@/features/mastery-grid/mastery-grid-pure";
import { VerdictPanel } from "@/features/guidance/verdict-panel";
import {
  skillTreeUnitAccordionFooter,
  skillTreeUnitTriggerLabel,
} from "@/shared/ui/accordion-messages-pure";
import { masteryNodeDetailStateLabel } from "@/shared/ui/popover-messages-pure";
import {
  MentrixaAccordion,
  MentrixaAccordionItem,
} from "@/shared/ui/accordion-patterns";
import { SkillNodeStrengthMeter } from "@/shared/ui/meter-patterns";
import { MasteryNodeDetailPopover } from "@/shared/ui/popover-patterns";
import { MentrixaVocabIcon, VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import { unitDisplayName } from "@/features/quest/ap-calc-unit-labels-pure";
import { AbCalculusSubjectTitle } from "@/features/quest/ui/ab-calc-subject-title";
import { UnitConceptIcon } from "@/features/quest/ui/skill-concept-icon";

const STATE_SQUARE_CLASS: Record<MasteryNodeState, string> = {
  none: "bg-slate-200/90 border-slate-300/80",
  weak: "bg-amber-300/90 border-amber-400/70",
  proficient: "bg-emerald-400/90 border-emerald-500/70",
  verified: "border-[var(--mx-gold)]/90",
};

const LEGEND_ITEMS: { word: string; state: MasteryNodeState; icon: "focus-ring" | "practice-pack" | "verified" }[] = [
  { word: "Open", state: "none", icon: "focus-ring" },
  { word: "Weak", state: "weak", icon: "practice-pack" },
  { word: "Solid", state: "proficient", icon: "practice-pack" },
  { word: "Verified", state: "verified", icon: "verified" },
];

function SkillTreeUnitMeta({ nodes }: { nodes: MasteryGridNode[] }) {
  const verified = nodes.filter((node) => node.state === "verified").length;
  return (
    <span className="inline-flex items-center gap-1.5">
      <MentrixaVocabIcon name="verified" size={14} gold surface="light" title="Verified" />
      <span className="font-mono text-[11px] font-bold tabular-nums">
        {verified}/{nodes.length}
      </span>
    </span>
  );
}

function MasteryLegendGlyph({ state }: { state: MasteryNodeState }) {
  if (state === "verified") {
    return (
      <span
        className={cn(
          "inline-flex h-3 w-3 items-center justify-center rounded-[2px] border",
          STATE_SQUARE_CLASS.verified,
        )}
        style={squareStyle("verified")}
        aria-hidden
      >
        <MentrixaVocabIcon name="verified" size={9} gold className="text-[var(--mx-navy)]" />
      </span>
    );
  }
  return (
    <span
      className={cn("h-2.5 w-2.5 rounded-[2px] border", STATE_SQUARE_CLASS[state])}
      aria-hidden
    />
  );
}

function squareStyle(state: MasteryNodeState): CSSProperties | undefined {
  return state === "verified" ? { backgroundColor: `${VERIFIED_GOLD}E6` } : undefined;
}

const GUIDE_PINNED_CLASS =
  "border-l-[3px] border-l-[var(--mx-violet)] shadow-[0_0_12px_2px_rgba(124,58,237,0.22)] ring-0 ring-offset-0";

export type MasteryPinnedAccent = "ring" | "guide";

function MasterySquare({
  node,
  unitNumber,
  animateFrom,
  isHighlight,
  isPinned,
  isFlagged,
  isRecommended,
  pinnedRingClassName,
  pinnedAccent = "ring",
  globalTopPercent,
  globalVerifiedCount,
  unlockedNodeIds,
  onNodePointerEnter,
  onNodePointerLeave,
}: {
  node: MasteryGridNode;
  unitNumber?: number;
  animateFrom?: MasteryNodeState;
  isHighlight?: boolean;
  isPinned?: boolean;
  isFlagged?: boolean;
  isRecommended?: boolean;
  pinnedRingClassName?: string;
  pinnedAccent?: MasteryPinnedAccent;
  globalTopPercent?: number | null;
  globalVerifiedCount?: number;
  unlockedNodeIds?: ReadonlySet<string> | null;
  onNodePointerEnter?: (node: MasteryGridNode, element: HTMLElement) => void;
  onNodePointerLeave?: () => void;
}) {
  const { nodeName, state } = node;
  const shouldAnimate = animateFrom != null && animateFrom !== state;
  const [displayState, setDisplayState] = useState(shouldAnimate ? animateFrom : state);
  const [showVerifiedGlyph, setShowVerifiedGlyph] = useState(
    !shouldAnimate && state === "verified"
  );

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayState(state);
      setShowVerifiedGlyph(state === "verified");
      return;
    }
    setDisplayState(animateFrom);
    setShowVerifiedGlyph(false);
    let timeout: any;
    const frame = requestAnimationFrame(() => {
      setDisplayState(state);
      if (state === "verified") {
        timeout = window.setTimeout(() => setShowVerifiedGlyph(true), 400);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timeout) clearTimeout(timeout);
    };
  }, [animateFrom, shouldAnimate, state]);

  const title = `${nodeName}: ${masteryNodeDetailStateLabel(displayState)}`;

  return (
    <MasteryNodeDetailPopover
      node={node}
      globalTopPercent={globalTopPercent}
      globalVerifiedCount={globalVerifiedCount}
      unitNumber={unitNumber}
      unlockedNodeIds={unlockedNodeIds}
      tone="light"
      placement="top"
    >
      <div
        data-skill-node-id={node.id}
        aria-label={title}
        onPointerEnter={(event) => onNodePointerEnter?.(node, event.currentTarget)}
        onPointerLeave={() => onNodePointerLeave?.()}
        className={cn(
          "relative aspect-square min-w-0 w-full rounded-[4px] border",
        STATE_SQUARE_CLASS[displayState],
        shouldAnimate && "transition-colors transition-duration-[400ms] ease-out",
        isHighlight && shouldAnimate && "z-10 ring-2 ring-indigo-400/80 ring-offset-1 ring-offset-[#FAFAF8]",
        isPinned &&
          pinnedAccent === "guide" &&
          GUIDE_PINNED_CLASS,
        isPinned &&
          pinnedAccent === "ring" &&
          (pinnedRingClassName ??
            "ring-2 ring-indigo-400/90 ring-offset-1 ring-offset-[#FAFAF8]"),
        isFlagged && "ring-2 ring-dashed ring-[var(--mx-violet)]/80 ring-offset-1 ring-offset-[#FAFAF8]",
        isRecommended && "ring-2 ring-dashed ring-[var(--mx-violet)]/70 ring-offset-1 ring-offset-[#FAFAF8]"
      )}
      style={squareStyle(displayState)}
    >
      {showVerifiedGlyph ? (
        <MentrixaVocabIcon
          name="verified"
          size={10}
          gold
          className="absolute bottom-0 right-0 text-[var(--mx-navy)]"
        />
      ) : null}
      </div>
    </MasteryNodeDetailPopover>
  );
}

function MasteryGridLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {LEGEND_ITEMS.map((item) => (
        <span key={item.word} className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
          <MasteryLegendGlyph state={item.state} />
          <MentrixaVocabIcon name={item.icon} size={16} gold={item.state === "verified"} surface="light" title={item.word} />
          <span>{item.word}</span>
        </span>
      ))}
    </div>
  );
}

function MasteryUnitGrid({
  nodes,
  unitNumber,
  compact,
  highlightTransition,
  pinnedNodeIds,
  flaggedNodeIds,
  recommendedNodeId,
  pinnedRingClassName,
  pinnedAccent = "ring",
  globalTopPercent,
  globalVerifiedCount,
  unlockedNodeIds,
  onNodePointerEnter,
  onNodePointerLeave,
}: {
  nodes: MasteryGridNode[];
  unitNumber?: number;
  compact: boolean;
  highlightTransition?: {
    nodeId: string;
    fromState: MasteryNodeState;
    toState: MasteryNodeState;
  };
  pinnedNodeIds?: Set<string>;
  flaggedNodeIds?: Set<string>;
  recommendedNodeId?: string;
  pinnedRingClassName?: string;
  pinnedAccent?: MasteryPinnedAccent;
  globalTopPercent?: number | null;
  globalVerifiedCount?: number;
  unlockedNodeIds?: ReadonlySet<string> | null;
  onNodePointerEnter?: (node: MasteryGridNode, element: HTMLElement) => void;
  onNodePointerLeave?: () => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-1.5",
        compact
          ? "grid-cols-[repeat(10,minmax(0,1fr))]"
          : "grid-cols-8 sm:grid-cols-10 md:grid-cols-12"
      )}
    >
      {nodes.map((node) => (
        <MasterySquare
          key={node.id}
          node={node}
          unitNumber={unitNumber}
          animateFrom={
            highlightTransition?.nodeId === node.id ? highlightTransition.fromState : undefined
          }
          isHighlight={highlightTransition?.nodeId === node.id}
          isPinned={pinnedNodeIds?.has(node.id)}
          isFlagged={flaggedNodeIds?.has(node.id)}
          isRecommended={recommendedNodeId === node.id}
          pinnedRingClassName={pinnedRingClassName}
          pinnedAccent={pinnedAccent}
          globalTopPercent={globalTopPercent}
          globalVerifiedCount={globalVerifiedCount}
          unlockedNodeIds={unlockedNodeIds}
          onNodePointerEnter={onNodePointerEnter}
          onNodePointerLeave={onNodePointerLeave}
        />
      ))}
    </div>
  );
}

function MasteryGridUnits({
  units,
  compact,
  highlightTransition,
  pinnedNodeIds,
  flaggedNodeIds,
  recommendedNodeId,
  pinnedRingClassName,
  pinnedAccent = "ring",
  globalTopPercent,
  globalVerifiedCount,
  unlockedNodeIds,
  collapsible = true,
  onNodePointerEnter,
  onNodePointerLeave,
}: {
  units: MasteryGridData["units"];
  compact: boolean;
  highlightTransition?: {
    nodeId: string;
    fromState: MasteryNodeState;
    toState: MasteryNodeState;
  };
  pinnedNodeIds?: Set<string>;
  flaggedNodeIds?: Set<string>;
  recommendedNodeId?: string;
  pinnedRingClassName?: string;
  pinnedAccent?: MasteryPinnedAccent;
  globalTopPercent?: number | null;
  globalVerifiedCount?: number;
  unlockedNodeIds?: ReadonlySet<string> | null;
  collapsible?: boolean;
  onNodePointerEnter?: (node: MasteryGridNode, element: HTMLElement) => void;
  onNodePointerLeave?: () => void;
}) {
  if (!collapsible) {
    return (
      <>
        {units.map((unit) => (
          <div key={unit.unitNumber}>
            <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mx-indigo)]">
              <UnitConceptIcon unitNumber={unit.unitNumber} size={28} surface="onLight" />
              <span className="line-clamp-2 min-w-0 text-left text-[10px] font-semibold leading-snug">
                {unitDisplayName(unit.unitNumber, unit.unitName)}
              </span>
            </p>
            <MasteryUnitGrid
              nodes={unit.nodes}
              unitNumber={unit.unitNumber}
              compact={compact}
              highlightTransition={highlightTransition}
              pinnedNodeIds={pinnedNodeIds}
              flaggedNodeIds={flaggedNodeIds}
              recommendedNodeId={recommendedNodeId}
              pinnedRingClassName={pinnedRingClassName}
              pinnedAccent={pinnedAccent}
              globalTopPercent={globalTopPercent}
              globalVerifiedCount={globalVerifiedCount}
              unlockedNodeIds={unlockedNodeIds}
              onNodePointerEnter={onNodePointerEnter}
              onNodePointerLeave={onNodePointerLeave}
            />
          </div>
        ))}
      </>
    );
  }

  const defaultExpandedKeys = units.length > 0 ? [`unit-${units[0]!.unitNumber}`] : [];

  return (
    <MentrixaAccordion
      tone="light"
      variant="surface"
      allowsMultipleExpanded
      defaultExpandedKeys={defaultExpandedKeys}
      hideSeparator
      className="space-y-2"
    >
      {units.map((unit) => {
        const footer = skillTreeUnitAccordionFooter(unit);
        return (
          <MentrixaAccordionItem
            key={unit.unitNumber}
            id={`unit-${unit.unitNumber}`}
            title={skillTreeUnitTriggerLabel(unit.unitNumber, unit.unitName)}
            meta={<SkillTreeUnitMeta nodes={unit.nodes} />}
            leadingIcon={
              <UnitConceptIcon unitNumber={unit.unitNumber} size={28} surface="onLight" />
            }
            verdict={footer.verdict}
            nextAction={footer.nextAction}
            className="overflow-hidden"
          >
            <MasteryUnitGrid
              nodes={unit.nodes}
              unitNumber={unit.unitNumber}
              compact={compact}
              highlightTransition={highlightTransition}
              pinnedNodeIds={pinnedNodeIds}
              flaggedNodeIds={flaggedNodeIds}
              recommendedNodeId={recommendedNodeId}
              pinnedRingClassName={pinnedRingClassName}
              pinnedAccent={pinnedAccent}
              globalTopPercent={globalTopPercent}
              globalVerifiedCount={globalVerifiedCount}
              unlockedNodeIds={unlockedNodeIds}
              onNodePointerEnter={onNodePointerEnter}
              onNodePointerLeave={onNodePointerLeave}
            />
          </MentrixaAccordionItem>
        );
      })}
    </MentrixaAccordion>
  );
}

export function MasteryGrid({
  data,
  className,
  compact = false,
  hideNextAction = false,
  showLegend = false,
  readOnly = false,
  sessionInteractive = false,
  highlightTransition,
  pinnedNodeIds,
  flaggedNodeIds,
  recommendedNodeId,
  pinnedRingClassName,
  pinnedAccent = "ring",
  remainderCollapsed = false,
  collapsibleUnits = true,
  unlockedNodeIds,
  onNodePointerEnter,
  onNodePointerLeave,
}: {
  data: MasteryGridData;
  className?: string;
  compact?: boolean;
  hideNextAction?: boolean;
  showLegend?: boolean;
  readOnly?: boolean;
  /** Keeps node hover active while the grid is otherwise read-only (Guide session tools). */
  sessionInteractive?: boolean;
  highlightTransition?: {
    nodeId: string;
    fromState: MasteryNodeState;
    toState: MasteryNodeState;
  };
  pinnedNodeIds?: string[];
  flaggedNodeIds?: Set<string>;
  recommendedNodeId?: string;
  pinnedRingClassName?: string;
  pinnedAccent?: MasteryPinnedAccent;
  remainderCollapsed?: boolean;
  collapsibleUnits?: boolean;
  unlockedNodeIds?: ReadonlySet<string> | null;
  onNodePointerEnter?: (node: MasteryGridNode, element: HTMLElement) => void;
  onNodePointerLeave?: () => void;
}) {
  const [remainderExpanded, setRemainderExpanded] = useState(false);

  const pinSplit = useMemo(() => {
    if (!pinnedNodeIds?.length) return null;
    return splitMasteryGridByPinned(data, pinnedNodeIds);
  }, [data, pinnedNodeIds]);

  const showPinnedSection = pinSplit != null && pinSplit.pinnedNodes.length > 0;
  const showRemainder =
    !pinSplit || !remainderCollapsed || remainderExpanded || pinSplit.remainderUnits.length === 0;
  const canExpandRemainder =
    Boolean(pinSplit) &&
    remainderCollapsed &&
    !remainderExpanded &&
    pinSplit!.remainderUnits.length > 0;

  return (
    <section
      className={cn(
        mentrixStudent.cardArena,
        compact ? "p-4 sm:p-5" : "p-5 sm:p-6",
        readOnly && !sessionInteractive && "pointer-events-none select-none",
        className
      )}
      aria-label="AP Calculus AB mastery grid"
      aria-readonly={readOnly || undefined}
    >
      <VocabSectionHeading name="mastery-grid" label="Grid" surface="light" />
      <div className="mt-1">
        <AbCalculusSubjectTitle />
      </div>

      {showLegend ? (
        <div className="mt-4">
          <MasteryGridLegend />
        </div>
      ) : null}

      <div className={cn("mt-5 space-y-5", compact && "mt-4 space-y-4", showLegend && "mt-4")}>
        {showPinnedSection ? (
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mx-indigo)]">
              <MentrixaVocabIcon name="focus-ring" size={18} surface="light" title="Focus" />
              <span>Focus</span>
            </p>
            <MasteryUnitGrid
              nodes={pinSplit!.pinnedNodes}
              compact={compact}
              highlightTransition={highlightTransition}
              pinnedNodeIds={new Set(pinnedNodeIds)}
              flaggedNodeIds={flaggedNodeIds}
              recommendedNodeId={recommendedNodeId}
              pinnedRingClassName={pinnedRingClassName}
              pinnedAccent={pinnedAccent}
              globalTopPercent={data.globalRank?.topPercent}
              globalVerifiedCount={data.globalRank?.verifiedCount}
              unlockedNodeIds={unlockedNodeIds}
              onNodePointerEnter={onNodePointerEnter}
              onNodePointerLeave={onNodePointerLeave}
            />
            <div className="mt-3 space-y-2">
              {pinSplit!.pinnedNodes.map((node) => {
                const unitNumber = data.units.find((unit) =>
                  unit.nodes.some((entry) => entry.id === node.id),
                )?.unitNumber;

                return (
                  <SkillNodeStrengthMeter
                    key={node.id}
                    nodeName={node.nodeName}
                    nodeSlug={node.nodeSlug}
                    unitNumber={unitNumber}
                    state={node.state}
                    accuracyPercent={node.accuracyPercent}
                    tone="light"
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {showRemainder ? (
          <MasteryGridUnits
            units={pinSplit?.remainderUnits ?? data.units}
            compact={compact}
            highlightTransition={highlightTransition}
            collapsible={collapsibleUnits}
            flaggedNodeIds={flaggedNodeIds}
            recommendedNodeId={recommendedNodeId}
            pinnedRingClassName={pinnedRingClassName}
            pinnedAccent={pinnedAccent}
            globalTopPercent={data.globalRank?.topPercent}
            globalVerifiedCount={data.globalRank?.verifiedCount}
            unlockedNodeIds={unlockedNodeIds}
            onNodePointerEnter={onNodePointerEnter}
            onNodePointerLeave={onNodePointerLeave}
          />
        ) : null}

        {canExpandRemainder ? (
          <button
            type="button"
            onClick={() => setRemainderExpanded(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--mx-indigo)] transition-colors hover:text-[#4F46E5]"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            Show full mastery grid
          </button>
        ) : null}
      </div>

      {!hideNextAction ? (
        data.verdict ? (
          <VerdictPanel verdict={data.verdict} tone="light" className="mt-5" />
        ) : (
          <p className="mt-5 text-sm font-medium text-[#475569]">{data.nextActionLine}</p>
        )
      ) : null}
    </section>
  );
}

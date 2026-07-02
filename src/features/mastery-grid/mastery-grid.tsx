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
  skillTreeUnitTriggerMeta,
} from "@/shared/ui/accordion-messages-pure";
import { masteryNodeDetailStateLabel } from "@/shared/ui/popover-messages-pure";
import {
  MentrixaAccordion,
  MentrixaAccordionItem,
} from "@/shared/ui/accordion-patterns";
import { SkillNodeStrengthMeter } from "@/shared/ui/meter-patterns";
import { MasteryNodeDetailPopover } from "@/shared/ui/popover-patterns";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

const STATE_SQUARE_CLASS: Record<MasteryNodeState, string> = {
  none: "bg-slate-700/70 border-slate-600/40",
  weak: "bg-amber-400/85 border-amber-300/50",
  proficient: "bg-emerald-500/85 border-emerald-400/50",
  verified: "border-[#D4A017]/90",
};

const LEGEND_ITEMS: { label: string; state: MasteryNodeState }[] = [
  { label: "Not started", state: "none" },
  { label: "Under 70%", state: "weak" },
  { label: "70% or higher", state: "proficient" },
  { label: "Verified", state: "verified" },
];

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
        <MentrixaVocabIcon name="verified" size={9} gold className="text-[#0B1220]" />
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

function MasterySquare({
  nodeName,
  state,
  accuracyPercent,
  animateFrom,
  isHighlight,
  isPinned,
}: {
  nodeName: string;
  state: MasteryNodeState;
  accuracyPercent: number | null;
  animateFrom?: MasteryNodeState;
  isHighlight?: boolean;
  isPinned?: boolean;
}) {
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
      nodeName={nodeName}
      state={displayState}
      accuracyPercent={accuracyPercent}
      tone="dark"
      placement="top"
    >
      <div
        aria-label={title}
        className={cn(
          "relative aspect-square min-w-0 w-full rounded-[4px] border",
        STATE_SQUARE_CLASS[displayState],
        shouldAnimate && "transition-colors duration-[400ms] ease-out",
        isHighlight && shouldAnimate && "z-10 ring-2 ring-indigo-400/80 ring-offset-1 ring-offset-[#0B1220]",
        isPinned && "ring-2 ring-indigo-400/90 ring-offset-1 ring-offset-[#0B1220]"
      )}
      style={squareStyle(displayState)}
    >
      {showVerifiedGlyph ? (
        <MentrixaVocabIcon
          name="verified"
          size={10}
          gold
          className="absolute bottom-0 right-0 text-[#0B1220]"
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
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
          <MasteryLegendGlyph state={item.state} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function MasteryUnitGrid({
  nodes,
  compact,
  highlightTransition,
  pinnedNodeIds,
}: {
  nodes: MasteryGridNode[];
  compact: boolean;
  highlightTransition?: {
    nodeId: string;
    fromState: MasteryNodeState;
    toState: MasteryNodeState;
  };
  pinnedNodeIds?: Set<string>;
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
          nodeName={node.nodeName}
          state={node.state}
          accuracyPercent={node.accuracyPercent}
          animateFrom={
            highlightTransition?.nodeId === node.id ? highlightTransition.fromState : undefined
          }
          isHighlight={highlightTransition?.nodeId === node.id}
          isPinned={pinnedNodeIds?.has(node.id)}
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
  collapsible = true,
}: {
  units: MasteryGridData["units"];
  compact: boolean;
  highlightTransition?: {
    nodeId: string;
    fromState: MasteryNodeState;
    toState: MasteryNodeState;
  };
  pinnedNodeIds?: Set<string>;
  collapsible?: boolean;
}) {
  if (!collapsible) {
    return (
      <>
        {units.map((unit) => (
          <div key={unit.unitNumber}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/90">
              {skillTreeUnitTriggerLabel(unit.unitNumber, unit.unitName)}
            </p>
            <MasteryUnitGrid
              nodes={unit.nodes}
              compact={compact}
              highlightTransition={highlightTransition}
              pinnedNodeIds={pinnedNodeIds}
            />
          </div>
        ))}
      </>
    );
  }

  const defaultExpandedKeys = units.length > 0 ? [`unit-${units[0]!.unitNumber}`] : [];

  return (
    <MentrixaAccordion
      tone="dark"
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
            meta={skillTreeUnitTriggerMeta(unit.nodes)}
            leadingIcon={
              <MentrixaVocabIcon name="unit" size={16} className="text-violet-300" />
            }
            verdict={footer.verdict}
            nextAction={footer.nextAction}
            className="overflow-hidden"
          >
            <MasteryUnitGrid
              nodes={unit.nodes}
              compact={compact}
              highlightTransition={highlightTransition}
              pinnedNodeIds={pinnedNodeIds}
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
  highlightTransition,
  pinnedNodeIds,
  remainderCollapsed = false,
  collapsibleUnits = true,
}: {
  data: MasteryGridData;
  className?: string;
  compact?: boolean;
  hideNextAction?: boolean;
  showLegend?: boolean;
  readOnly?: boolean;
  highlightTransition?: {
    nodeId: string;
    fromState: MasteryNodeState;
    toState: MasteryNodeState;
  };
  pinnedNodeIds?: string[];
  remainderCollapsed?: boolean;
  collapsibleUnits?: boolean;
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
        readOnly && "pointer-events-none select-none",
        className
      )}
      aria-label="AP Calculus AB mastery grid"
      aria-readonly={readOnly || undefined}
    >
      <p className={`${mentrixStudent.sectionEyebrow} inline-flex items-center gap-1.5`}>
        <MentrixaVocabIcon name="mastery-grid" size={14} className="text-violet-300" />
        Mastery grid
      </p>
      <p className="mt-1 text-sm text-violet-100/90">{data.subject}</p>

      {showLegend ? (
        <div className="mt-4">
          <MasteryGridLegend />
        </div>
      ) : null}

      <div className={cn("mt-5 space-y-5", compact && "mt-4 space-y-4", showLegend && "mt-4")}>
        {showPinnedSection ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200/90">
              Session focus
            </p>
            <MasteryUnitGrid
              nodes={pinSplit!.pinnedNodes}
              compact={compact}
              highlightTransition={highlightTransition}
              pinnedNodeIds={new Set(pinnedNodeIds)}
            />
            <div className="mt-3 space-y-2">
              {pinSplit!.pinnedNodes.map((node) => (
                <SkillNodeStrengthMeter
                  key={node.id}
                  nodeName={node.nodeName}
                  state={node.state}
                  accuracyPercent={node.accuracyPercent}
                  tone="dark"
                />
              ))}
            </div>
          </div>
        ) : null}

        {showRemainder ? (
          <MasteryGridUnits
            units={pinSplit?.remainderUnits ?? data.units}
            compact={compact}
            highlightTransition={highlightTransition}
            collapsible={collapsibleUnits}
          />
        ) : null}

        {canExpandRemainder ? (
          <button
            type="button"
            onClick={() => setRemainderExpanded(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 transition-colors hover:text-indigo-100"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            Show full mastery grid
          </button>
        ) : null}
      </div>

      {!hideNextAction ? (
        data.verdict ? (
          <VerdictPanel verdict={data.verdict} tone="dark" className="mt-5" />
        ) : (
          <p className="mt-5 text-sm font-medium text-slate-100">{data.nextActionLine}</p>
        )
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MasteryNode, type MasteryNodeVisualState } from "@/components/mastery-node";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import type {
  MasteryGridData,
  QuestMasteryHighlight,
  QuestOpenedHighlight,
  QuestPhoenixHighlight,
  QuestFasterHighlight,
} from "@/features/mastery-grid/types";
import { toMasteryNodeVisualState } from "@/features/mastery-grid/mastery-grid-pure";
import { QuestAnimatedSticky } from "@/features/quest/ui/quest-animated-sticky";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "@/shared/animation/motion";
import { animate } from "@/shared/animation/anime";
import { useGsapEffect } from "@/shared/core/gsap-lazy";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { Button } from "@/shared/ui/button";
import { CALC_READINESS_LABEL } from "@/features/student-home/ap-readiness-band-pure";
import {
  apBandImproved,
  apBandScorePercent,
  buildApBandFromGrid,
  buildPriorApBand,
  buildQuestDoneHeroLabel,
  buildQuestDonePrimaryAction,
} from "@/features/quest/ui/quest-done-screen-pure";
import { cn } from "@/shared/core/utils";

function domainToVisualState(
  state: QuestMasteryHighlight["fromState"],
  accuracyPercent: number | null = null,
): MasteryNodeVisualState {
  if (state === "none") return "unstarted";
  if (state === "verified") return "verified";
  if (state === "proficient") return "proficient";
  if ((accuracyPercent ?? 55) >= 40) return "practiced";
  return "attempted";
}

function QuestDoneHeroNode({
  highlight,
  grid,
}: {
  highlight: QuestMasteryHighlight;
  grid: MasteryGridData;
}) {
  const reduceMotion = useReducedMotion();
  const node = grid.units.flatMap((u) => u.nodes).find((n) => n.id === highlight.nodeId);
  const fromVisual = domainToVisualState(
    highlight.fromState,
    highlight.fromState === "weak" ? 55 : node?.accuracyPercent ?? null,
  );
  const toVisual = node
    ? toMasteryNodeVisualState(node)
    : domainToVisualState(highlight.toState, null);
  const [displayState, setDisplayState] = useState(fromVisual);
  const [bloom, setBloom] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) {
      setDisplayState(toVisual);
      return;
    }
    setDisplayState(fromVisual);
    setBloom(false);
    const bloomTimer = window.setTimeout(() => {
      setBloom(true);
      setDisplayState(toVisual);
    }, 500);
    const bloomEnd = window.setTimeout(() => setBloom(false), 1100);
    return () => {
      window.clearTimeout(bloomTimer);
      window.clearTimeout(bloomEnd);
    };
  }, [fromVisual, toVisual, reduceMotion]);

  useGsapEffect(
    (gsap) => {
      const shell = shellRef.current;
      if (!shell || reduceMotion) return;
      gsap.fromTo(
        shell,
        { scale: 0.72, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.7)" },
      );
    },
    [reduceMotion, highlight.nodeId],
  );

  return (
    <div ref={shellRef} className="relative flex flex-col items-center">
      <motion.div
        className="relative"
        animate={
          bloom && !reduceMotion
            ? { scale: [1, 1.18, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {bloom && !reduceMotion ? (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-4 rounded-[var(--radius-node)] border-2 border-[var(--mx-indigo)]"
            initial={{ opacity: 0.85, scale: 0.75 }}
            animate={{ opacity: 0, scale: 1.25 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        ) : null}
        <MasteryNode
          nodeId={highlight.nodeId}
          nodeName={highlight.nodeName}
          state={displayState}
          accuracy={node?.accuracyPercent ?? undefined}
          size="lg"
          showGlow={displayState === "verified"}
        />
      </motion.div>
    </div>
  );
}

function QuestDoneTypewriterLabel({
  text,
  startDelayMs = 800,
}: {
  text: string;
  startDelayMs?: number;
}) {
  const labelRef = useRef<HTMLParagraphElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    if (reduceMotion) {
      el.textContent = text;
      return;
    }
    el.textContent = "";
    const proxy = { progress: 0 };
    const anim = animate(proxy, {
      progress: text.length,
      duration: 600,
      delay: startDelayMs,
      ease: "linear",
      onUpdate: () => {
        el.textContent = text.slice(0, Math.round(proxy.progress));
      },
    });
    return () => {
      anim.pause();
    };
  }, [text, startDelayMs, reduceMotion]);

  return (
    <p
      ref={labelRef}
      className="mt-5 max-w-md text-center font-[family-name:var(--font-playfair),serif] text-[20px] leading-snug text-white"
    />
  );
}

function QuestDoneReadinessBand({
  beforePercent,
  afterPercent,
  improved,
  bandLabel,
  bandSublabel,
  score,
  isVerified,
}: {
  beforePercent: number;
  afterPercent: number;
  improved: boolean;
  bandLabel: string;
  bandSublabel: string;
  score: number | null;
  isVerified: boolean;
}) {
  const pillRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [fillWidth, setFillWidth] = useState(reduceMotion ? afterPercent : beforePercent);

  useEffect(() => {
    if (reduceMotion) {
      setFillWidth(afterPercent);
      return;
    }
    setFillWidth(beforePercent);
    const proxy = { value: beforePercent };
    const anim = animate(proxy, {
      value: afterPercent,
      duration: 700,
      delay: 900,
      ease: "outQuart",
      onUpdate: () => setFillWidth(proxy.value),
    });
    return () => {
      anim.pause();
    };
  }, [afterPercent, beforePercent, reduceMotion]);

  useEffect(() => {
    if (!improved || reduceMotion || !pillRef.current) return;
    const pill = pillRef.current;
    const particles = Array.from({ length: 10 }, () => {
      const dot = document.createElement("span");
      dot.className = "quest-done-band-particle pointer-events-none absolute size-1.5 rounded-full bg-[var(--mx-gold)]";
      dot.style.left = "50%";
      dot.style.top = "50%";
      pill.appendChild(dot);
      return dot;
    });
    const angleStep = (Math.PI * 2) / particles.length;
    particles.forEach((dot, index) => {
      const angle = angleStep * index + Math.random() * 0.4;
      const distance = 24 + Math.random() * 28;
      animate(dot, {
        translateX: Math.cos(angle) * distance,
        translateY: Math.sin(angle) * distance,
        opacity: [1, 0],
        scale: [1, 0.4],
        duration: 400,
        delay: 1000 + index * 12,
        ease: "outQuart",
      });
    });
    return () => {
      particles.forEach((dot) => dot.remove());
    };
  }, [improved, reduceMotion]);

  return (
    <div
      ref={pillRef}
      className="relative overflow-hidden rounded-[var(--radius-pill)] border border-white/15 bg-[var(--mx-navy-2)] px-4 py-3"
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 bg-[var(--mx-primary)]/25 transition-none"
        style={{ width: `${fillWidth}%` }}
      />
      <div className="relative flex items-center gap-3">
        <MentrixaVocabIcon
          name="trajectory-certificate"
          size={28}
          surface="dark"
          gold={isVerified}
          title={CALC_READINESS_LABEL}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mx-indigo)]">
              {bandLabel}
            </span>
            {score != null ? (
              <span
                className={cn(
                  "font-[family-name:var(--font-playfair),serif] text-lg font-bold tabular-nums",
                  isVerified ? "text-[var(--mx-gold)]" : "text-white",
                )}
              >
                {score}/5
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-white/70">{bandSublabel}</p>
        </div>
      </div>
    </div>
  );
}

function QuestDoneDetailsAccordion({
  correct,
  total,
  xpAwarded,
  perfectBonus,
  phoenixXp,
  openedHighlight,
  fasterHighlight,
}: {
  correct: number;
  total: number;
  xpAwarded: number;
  perfectBonus: number;
  phoenixXp: number;
  openedHighlight?: QuestOpenedHighlight | null;
  fasterHighlight?: QuestFasterHighlight | null;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const xpTotal = xpAwarded + perfectBonus + phoenixXp;

  return (
    <div className="overflow-hidden rounded-[var(--radius-node)] border border-[var(--mx-rule)]/30 bg-white/95">
      <motion.button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        whileHover={reduceMotion ? undefined : { scale: 1.01 }}
        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--mx-navy)]">
          <MentrixaVocabIcon name="loop-report" size={16} surface="light" title="Quest details" />
          Quest details
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </motion.button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-[var(--mx-rule)]/40 px-4 py-3 text-sm text-[var(--mx-steel)]">
              <p>
                Questions: {correct} correct of {total}
              </p>
              {xpTotal > 0 ? (
                <p>
                  XP: +{xpAwarded}
                  {perfectBonus > 0 ? ` · perfect +${perfectBonus}` : ""}
                  {phoenixXp > 0 ? ` · recovery +${phoenixXp}` : ""}
                </p>
              ) : null}
              {openedHighlight ? <p>Opened: {openedHighlight.nodeName}</p> : null}
              {fasterHighlight ? <p>Faster on: {fasterHighlight.nodeName}</p> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function QuestDoneScreen({
  grid,
  masteryHighlight,
  openedHighlight,
  phoenixHighlight,
  fasterHighlight,
  packSkillNodeIds = [],
  correct,
  total,
  xpAwarded,
  perfectBonus,
  newVerifiedSkills = 0,
  onTryAgain,
  shareHref = "/student/progress",
  className,
}: {
  grid: MasteryGridData;
  masteryHighlight?: QuestMasteryHighlight | null;
  openedHighlight?: QuestOpenedHighlight | null;
  phoenixHighlight?: QuestPhoenixHighlight | null;
  fasterHighlight?: QuestFasterHighlight | null;
  packSkillNodeIds?: string[];
  correct: number;
  total: number;
  xpAwarded: number;
  perfectBonus: number;
  newVerifiedSkills?: number;
  onTryAgain?: () => void;
  shareHref?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  const highlight = useMemo((): QuestMasteryHighlight => {
    if (masteryHighlight) return masteryHighlight;
    const fallbackNode =
      grid.units.flatMap((u) => u.nodes).find((n) => packSkillNodeIds.includes(n.id)) ??
      grid.units.flatMap((u) => u.nodes)[0];
    return {
      nodeId: fallbackNode?.id ?? "unknown",
      nodeName: fallbackNode?.nodeName ?? "This skill",
      fromState: fallbackNode?.state ?? "none",
      toState: fallbackNode?.state ?? "none",
      unchanged: true,
      verdictLine: "Keep practicing until the grid moves.",
    };
  }, [grid, masteryHighlight, packSkillNodeIds]);

  const heroLabel = buildQuestDoneHeroLabel(highlight);
  const afterBand = buildApBandFromGrid(grid);
  const beforeBand = buildPriorApBand(grid, newVerifiedSkills);
  const bandImproved = apBandImproved(beforeBand, afterBand);
  const primaryAction = buildQuestDonePrimaryAction({
    highlight,
    newVerifiedSkills,
    shareHref,
  });

  useGsapEffect(
    (gsap) => {
      const root = gridRef.current;
      if (!root || reduceMotion) return;
      const pulseTarget = root.querySelector(`[aria-label^="${highlight.nodeName}:"]`);
      if (!pulseTarget) return;
      gsap.fromTo(
        pulseTarget,
        { scale: 1 },
        {
          scale: 1.2,
          duration: 0.28,
          yoyo: true,
          repeat: 1,
          ease: "power2.out",
          delay: 1.4,
        },
      );
    },
    [highlight.nodeId, reduceMotion],
  );

  return (
    <QuestAnimatedSticky variant="taped" className={cn("mx-auto max-w-3xl", className)}>
      <div className="space-y-5 p-2 sm:p-3">
        <section className="overflow-hidden rounded-[var(--radius-card)] bg-[var(--mx-navy)] px-5 py-8 sm:px-8">
          <div className="mb-4 flex items-center justify-center gap-2">
            <MentrixaVocabIcon name="mastery-grid" size={20} surface="dark" title="Grid movement" />
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--mx-indigo)]">
              What changed on your grid
            </p>
          </div>
          <QuestDoneHeroNode highlight={highlight} grid={grid} />
          <QuestDoneTypewriterLabel text={heroLabel} />
          {highlight.unchanged && onTryAgain ? (
            <div className="mt-4 flex justify-center">
              <Button type="button" variant="outline" onClick={onTryAgain} className="border-white/20 text-white">
                Try again
              </Button>
            </div>
          ) : null}
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2">
            <MentrixaVocabIcon name="trajectory-certificate" size={18} surface="light" title="Readiness" />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mx-indigo)]">
              {CALC_READINESS_LABEL}
            </p>
          </div>
          <QuestDoneReadinessBand
            beforePercent={apBandScorePercent(beforeBand)}
            afterPercent={apBandScorePercent(afterBand)}
            improved={bandImproved}
            bandLabel={afterBand.label}
            bandSublabel={afterBand.sublabel}
            score={afterBand.score}
            isVerified={afterBand.isVerifiedPrediction}
          />
        </section>

        <section ref={gridRef}>
          <div className="mb-2 flex items-center gap-2">
            <MentrixaVocabIcon name="skills" size={18} surface="light" title="Mini grid" />
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mx-indigo)]">
              Mini mastery grid
            </p>
          </div>
          <MasteryGrid
            data={grid}
            compact
            hideNextAction
            readOnly
            collapsibleUnits={false}
            highlightTransition={
              !highlight.unchanged
                ? {
                    nodeId: highlight.nodeId,
                    fromState: highlight.fromState,
                    toState: highlight.toState,
                  }
                : undefined
            }
            pinnedNodeIds={[highlight.nodeId]}
          />
        </section>

        <motion.div
          initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.15 }}
        >
          <Button variant="workbenchPrimary" className="min-h-12 w-full" asChild>
            <Link href={primaryAction.href} className="inline-flex items-center justify-center gap-2">
              <MentrixaVocabIcon
                name={
                  primaryAction.kind === "share"
                    ? "movement-receipt"
                    : primaryAction.kind === "guide"
                      ? "guide-session"
                      : "practice-pack"
                }
                size={18}
                surface="dark"
                title={primaryAction.label}
              />
              {primaryAction.label}
            </Link>
          </Button>
        </motion.div>

        <QuestDoneDetailsAccordion
          correct={correct}
          total={total}
          xpAwarded={xpAwarded}
          perfectBonus={perfectBonus}
          phoenixXp={phoenixHighlight?.xpAwarded ?? 0}
          openedHighlight={openedHighlight}
          fasterHighlight={fasterHighlight}
        />
      </div>
    </QuestAnimatedSticky>
  );
}

/** @deprecated Use QuestDoneScreen */
export const QuestMasteryDonePanel = QuestDoneScreen;

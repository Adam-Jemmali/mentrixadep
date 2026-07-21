"use client";

import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "@/shared/animation/anime";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { cn } from "@/shared/core/utils";
import { MasteryGrid } from "@/features/mastery-grid/mastery-grid";
import { ApReadinessBand } from "@/features/student-home/ap-readiness-band";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { BklitShimmer } from "@/shared/ui/bklit-shimmer";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import type { PreSessionContext } from "@/features/pre-session-brief/types";
import { isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

const INTELLIGENCE_ROWS = [
  { key: "strongestNodeName", label: "Strongest node" },
  { key: "gapNodeName", label: "Most attempted, lowest accuracy" },
  { key: "lastGuideSessionLabel", label: "Last session with a Guide" },
  { key: "focusSignalDisplay", label: "Focus signal" },
] as const;

export function GuideContextClient({
  context,
  loading = false,
}: {
  context: PreSessionContext | null;
  loading?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const gridShellRef = useRef<HTMLDivElement>(null);
  const [revealStep, setRevealStep] = useState(0);

  useEffect(() => {
    if (loading || !context) {
      setRevealStep(0);
      return;
    }
    setRevealStep(1);
    const t2 = window.setTimeout(() => setRevealStep(2), 420);
    const t3 = window.setTimeout(() => setRevealStep(3), 780);
    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [loading, context]);

  useEffect(() => {
    if (revealStep < 1 || reduceMotion || !gridShellRef.current) return;
    const nodes = gridShellRef.current.querySelectorAll<HTMLElement>("[data-skill-node-id]");
    if (nodes.length === 0) return;

    void animate(nodes, {
      opacity: [0, 1],
      scale: [0.82, 1],
      delay: stagger(28, { from: "first" }),
      duration: 380,
      ease: "outCubic",
    });
  }, [revealStep, reduceMotion, context?.sessionId]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <BklitShimmer className="h-52 w-full rounded-xl" aria-label="Loading student truth" />
        <BklitShimmer className="h-28 w-full rounded-xl" aria-label="Loading session intelligence" />
        <BklitShimmer className="h-36 w-full rounded-xl" aria-label="Loading warmup item" />
      </div>
    );
  }

  if (!context || !isApCalculusAbSubject(context.subject) || !context.masteryGrid) {
    return (
      <p className="text-xs text-slate-600">
        Student context is not available for this subject yet.
      </p>
    );
  }

  const intelligence = context.sessionIntelligence;
  const warmup = context.warmupItem;

  return (
    <div className="space-y-5">
      <section
        className={cn(
          "space-y-3 transition-opacity duration-300",
          revealStep >= 1 ? "opacity-100" : "opacity-0",
        )}
      >
        <header className="inline-flex items-center gap-2">
          <MentrixaVocabIcon name="verified" size={18} surface="light" title="Student truth" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6366F1]">
            Student truth
          </h3>
        </header>

        <div ref={gridShellRef}>
          <MasteryGrid
            data={context.masteryGrid}
            compact={false}
            showLegend
            readOnly
            remainderCollapsed
            pinnedNodeIds={context.sessionTargetNodeIds}
            pinnedAccent="guide"
          />
        </div>

        {context.readinessBand ? (
          <ApReadinessBand band={context.readinessBand} className="w-full max-w-full" />
        ) : null}

        {context.workingTowardLine ? (
          <p className="text-xs font-medium leading-snug text-[#475569]">
            {context.workingTowardLine}
          </p>
        ) : null}
      </section>

      {intelligence ? (
        <section
          className={cn(
            "rounded-xl border border-[#E2E8F0] bg-white/80 p-3",
            revealStep >= 2 ? "opacity-100" : "opacity-0",
          )}
        >
          <header className="mb-3 inline-flex items-center gap-2">
            <MentrixaVocabIcon name="guide-session" size={18} surface="light" title="Session intelligence" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6366F1]">
              Session intelligence
            </h3>
          </header>

          <dl className="space-y-2">
            {INTELLIGENCE_ROWS.map((row, index) => {
              const raw = intelligence[row.key];
              const value =
                row.key === "focusSignalDisplay" ? raw : raw;
              return (
                <IntelligenceRow
                  key={row.key}
                  label={row.label}
                  value={String(value)}
                  index={index}
                  visible={revealStep >= 2}
                  reduceMotion={Boolean(reduceMotion)}
                />
              );
            })}
          </dl>
        </section>
      ) : null}

      <section
        className={cn(
          "rounded-xl border border-[#E2E8F0] bg-white/80 p-3",
          revealStep >= 3 ? "opacity-100" : "opacity-0",
        )}
      >
        <header className="mb-2 inline-flex items-center gap-2">
          <MentrixaVocabIcon name="practice-pack" size={18} surface="light" title="Warmup item" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6366F1]">
            Suggested opening question for this session
          </h3>
        </header>

        {warmup ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7C3AED]">
              {warmup.nodeName}
            </p>
            <div className="text-sm leading-relaxed text-[#0B1220]">
              <PromptWithMath text={warmup.prompt} />
            </div>
            {warmup.options?.length ? (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {warmup.options.map((option, index) => (
                  <li
                    key={`${index}-${option.slice(0, 20)}`}
                    className="rounded-lg border border-[#E2E8F0] bg-[#FAFAF8] px-2.5 py-2 text-xs text-[#334155]"
                  >
                    <span className="mr-1.5 font-mono text-[10px] font-bold text-[#6366F1]">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <PromptWithMath text={option} />
                  </li>
                ))}
              </ul>
            ) : null}
          </motion.div>
        ) : (
          <p className="text-xs text-[#64748B]">
            No reviewed opening item for the weakest target node yet.
          </p>
        )}
      </section>
    </div>
  );
}

function IntelligenceRow({
  label,
  value,
  index,
  visible,
  reduceMotion,
}: {
  label: string;
  value: string;
  index: number;
  visible: boolean;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: -18 }}
      animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -18 }}
      transition={{
        delay: reduceMotion ? 0 : index * 0.08,
        duration: 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between"
    >
      <dt className="text-[11px] font-semibold text-[#64748B]">{label}</dt>
      <dd className="text-xs font-semibold text-[#0B1220]">{value}</dd>
    </motion.div>
  );
}

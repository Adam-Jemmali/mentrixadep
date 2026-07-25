"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { animate } from "@/shared/animation/anime";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import {
  clampMcqOptionIndex,
  mcqFocusIndexAfterArrow,
} from "@/features/quest/quest-mcq-focus-pure";
import { QUEST_RUN_SURFACE, type QuestSurface } from "@/features/quest/ui/quest-surface";
import { cn } from "@/shared/core/utils";

const optionVariants = {
  hidden: { x: -16, opacity: 0 },
  visible: (i: number) => ({
    x: 0,
    opacity: 1,
    transition: { delay: i * 0.08, duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function QuestMcqOptions({
  options,
  picked,
  result,
  busy,
  onSelect,
  surface = QUEST_RUN_SURFACE,
}: {
  options: string[];
  picked: number | null;
  result: {
    correct: boolean;
    correctIndex: number;
  } | null;
  busy: boolean;
  onSelect: (index: number) => void;
  surface?: QuestSurface;
}) {
  const reduceMotion = useReducedMotion();
  const isDark = surface === "dark";
  const wrongRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusedIndexRef = useRef(0);

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, options.length);
  }, [options.length]);

  useEffect(() => {
    if (result != null || busy) return;
    focusedIndexRef.current = 0;
    optionRefs.current[0]?.focus();
  }, [options, result, busy]);

  useEffect(() => {
    if (!result || result.correct || picked == null || reduceMotion) return;
    const el = wrongRef.current;
    if (!el) return;
    animate(el, {
      translateX: [0, -8, 8, -6, 6, -4, 4, 0],
      duration: 500,
      ease: "easeInOutSine",
    });
  }, [result, picked, reduceMotion]);

  const focusOption = useCallback((index: number) => {
    const clamped = clampMcqOptionIndex(index, options.length);
    focusedIndexRef.current = clamped;
    optionRefs.current[clamped]?.focus();
  }, [options.length]);

  const handleOptionKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (result || busy) return;

      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowLeft"
      ) {
        event.preventDefault();
        const next = mcqFocusIndexAfterArrow(
          index,
          event.key as "ArrowDown" | "ArrowRight" | "ArrowUp" | "ArrowLeft",
          options.length,
        );
        focusOption(next);
      }
    },
    [busy, focusOption, options.length, result],
  );

  return (
    <div
      role="radiogroup"
      aria-label="Answer choices"
      className="grid gap-2 sm:grid-cols-2"
    >
      {options.map((opt, i) => {
        const isCorrect = result != null && i === result.correctIndex;
        const isWrongPick = result != null && i === picked && !result.correct;
        const isPicked = picked === i && !result;

        return (
          <motion.button
            key={`${i}-${opt.slice(0, 24)}`}
            type="button"
            role="radio"
            aria-checked={isPicked || isCorrect}
            custom={i}
            variants={optionVariants}
            initial="hidden"
            animate="visible"
            disabled={!!result || busy}
            ref={(el) => {
              optionRefs.current[i] = el;
              if (isWrongPick) wrongRef.current = el;
            }}
            onClick={() => {
              if (result) return;
              onSelect(i);
            }}
            onKeyDown={(event) => handleOptionKeyDown(i, event)}
            whileHover={
              reduceMotion || result
                ? undefined
                : { scale: 1.01, backgroundColor: "rgba(124, 58, 237, 0.1)" }
            }
            whileTap={reduceMotion || result ? undefined : { scale: 0.98 }}
            className={cn(
              "relative overflow-hidden rounded-xl border p-4 text-left text-sm transition-colors [&_.katex]:text-inherit",
              isDark
                ? [
                    !result && !isPicked &&
                      "border-white/20 bg-[var(--mx-navy-2)] text-white hover:border-[var(--mx-indigo)] hover:bg-white/5",
                    isPicked &&
                      "border-[var(--mx-indigo)] bg-[var(--mx-indigo)]/20 ring-2 ring-[var(--mx-indigo)]/40 text-white",
                    isCorrect &&
                      "border-l-[3px] border-l-emerald-400 border-emerald-400/70 bg-emerald-500/20 text-emerald-50",
                    isWrongPick && "border-red-400/80 bg-red-500/20 text-red-50",
                    result &&
                      !isCorrect &&
                      !isWrongPick &&
                      "border-white/10 bg-[var(--mx-navy-2)]/50 text-white/45",
                  ]
                : [
                    !result && !isPicked &&
                      "border-violet-300 bg-white text-[var(--mx-navy)] hover:border-[var(--mx-indigo)]",
                    isPicked &&
                      "border-[var(--mx-indigo)] bg-violet-100 ring-2 ring-[var(--mx-indigo)]/40",
                    isCorrect &&
                      "border-l-[3px] border-l-emerald-500 border-emerald-400/80 bg-emerald-500/20 text-emerald-950",
                    isWrongPick && "border-red-400/80 bg-red-500/10 text-red-950",
                    result &&
                      !isCorrect &&
                      !isWrongPick &&
                      "border-violet-300 bg-[#F8FAFC] text-[#64748B] opacity-80",
                  ],
            )}
          >
            {isCorrect ? (
              <motion.span
                className={cn(
                  "absolute left-3 top-3",
                  isDark ? "text-emerald-300" : "text-emerald-600",
                )}
                initial={reduceMotion ? false : { x: -12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
                aria-hidden
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </motion.span>
            ) : null}
            <span className={cn(isCorrect && "pl-6")}>
              <PromptWithMath text={opt} variant={surface} highlightKeyTerms />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

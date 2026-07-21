"use client";

import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { animate } from "@/shared/animation/anime";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
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
}: {
  options: string[];
  picked: number | null;
  result: {
    correct: boolean;
    correctIndex: number;
  } | null;
  busy: boolean;
  onSelect: (index: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const wrongRef = useRef<HTMLButtonElement>(null);

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

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt, i) => {
        const isCorrect = result != null && i === result.correctIndex;
        const isWrongPick = result != null && i === picked && !result.correct;
        const isPicked = picked === i && !result;

        return (
          <motion.button
            key={`${i}-${opt.slice(0, 24)}`}
            type="button"
            custom={i}
            variants={optionVariants}
            initial="hidden"
            animate="visible"
            disabled={!!result || busy}
            ref={isWrongPick ? wrongRef : undefined}
            onClick={() => {
              if (result) return;
              onSelect(i);
            }}
            whileHover={
              reduceMotion || result
                ? undefined
                : { scale: 1.01, backgroundColor: "rgba(124, 58, 237, 0.1)" }
            }
            whileTap={reduceMotion || result ? undefined : { scale: 0.98 }}
            className={cn(
              "relative overflow-hidden rounded-xl border p-4 text-left text-sm transition-colors [&_.katex]:text-inherit",
              !result && !isPicked && "border-[#A5B4FC] bg-white text-[#0B1220] hover:border-[#6366F1]",
              isPicked && "border-[#6366F1] bg-[#EDE9FE] ring-2 ring-[#6366F1]/40",
              isCorrect &&
                "border-l-[3px] border-l-emerald-500 border-emerald-400/80 bg-emerald-500/20 text-emerald-950",
              isWrongPick && "border-red-400/80 bg-red-500/10 text-red-950",
              result && !isCorrect && !isWrongPick && "border-[#C4B5FD] bg-[#F8FAFC] text-[#64748B] opacity-80",
            )}
          >
            {isCorrect ? (
              <motion.span
                className="absolute left-3 top-3 text-emerald-600"
                initial={reduceMotion ? false : { x: -12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
                aria-hidden
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </motion.span>
            ) : null}
            <span className={cn(isCorrect && "pl-6")}>
              <PromptWithMath text={opt} variant="light" highlightKeyTerms />
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { motion, Reorder } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { LandingSpeechBubble } from "@/features/marketing/landing/v2/motion/landing-speech-bubble";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import { springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";

const STEPS = [
  { id: "book", number: "01", icon: "/images/book.webp", title: "Book" },
  { id: "meet", number: "02", icon: "/images/live.webp", title: "Meet" },
  { id: "unpack", number: "03", icon: "/images/package.webp", title: "Unpack" },
  { id: "climb", number: "04", icon: "/images/xp.webp", title: "Climb" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function shuffleIds(ids: StepId[]): StepId[] {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  if (next.every((id, i) => id === STEPS[i]!.id)) {
    return shuffleIds(next);
  }
  return next;
}

const CORRECT_ORDER = STEPS.map((s) => s.id);

/** Deterministic scramble for SSR — reshuffled after mount. */
const STABLE_STEP_ORDER: StepId[] = ["climb", "meet", "book", "unpack"];

type CoachTone = "coach" | "success" | "error";

type Props = {
  onCompletedChange?: (completed: boolean) => void;
};

export function FlowStepsOrderGame({ onCompletedChange }: Props) {
  const { cinematic } = useLandingMotion();
  const [order, setOrder] = useState<StepId[]>(STABLE_STEP_ORDER);
  const [completed, setCompleted] = useState(false);

  const [coach, setCoach] = useState<{ message: string; tone: CoachTone }>({
    message: "Get the sequence right. Every person who moves their rank runs these four in this exact order. Drag them into place.",
    tone: "coach",
  });

  const stepMap = useMemo(() => new Map(STEPS.map((s) => [s.id, s])), []);

  useEffect(() => {
    setOrder(shuffleIds(CORRECT_ORDER));
  }, []);

  const onCompletedChangeRef = useRef(onCompletedChange);
  onCompletedChangeRef.current = onCompletedChange;

  useEffect(() => {
    onCompletedChangeRef.current?.(completed);
  }, [completed]);

  const checkOrder = useCallback((next: StepId[]) => {
    const correct = next.every((id, i) => id === CORRECT_ORDER[i]);
    if (correct) {
      setCompleted(true);
      setCoach({ message: "Loop locked. Book. Meet. Unpack. Climb. Every subject.", tone: "success" });
    } else {
      setCoach({ message: "Close. Keep sorting until Book leads the line.", tone: "error" });
    }
  }, []);

  const handleReorder = useCallback(
    (next: StepId[]) => {
      setOrder(next);
      if (!completed) checkOrder(next);
    },
    [checkOrder, completed],
  );

  const moveStep = useCallback(
    (index: number, direction: -1 | 1) => {
      if (completed) return;
      const target = index + direction;
      if (target < 0 || target >= order.length) return;
      const next = [...order];
      [next[index], next[target]] = [next[target]!, next[index]!];
      handleReorder(next);
    },
    [completed, handleReorder, order],
  );

  const handleRowKeyDown = useCallback(
    (index: number, event: KeyboardEvent<HTMLLIElement>) => {
      if (completed) return;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveStep(index, -1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveStep(index, 1);
      }
    },
    [completed, moveStep],
  );

  const reset = useCallback(() => {
    setOrder(shuffleIds(CORRECT_ORDER));
    setCompleted(false);
    setCoach({ message: "Get the sequence right. Every person who moves their rank runs these four in this exact order. Drag them into place.", tone: "coach" });
  }, []);

  return (
    <div className="mt-10 rounded-3xl border border-white/10 bg-slate-950/50 p-4 sm:p-6">
      <LandingSpeechBubble message={coach.message} tone={coach.tone} label="Get the order right" className="mx-auto mb-5" />

      <Reorder.Group
        axis="y"
        values={order}
        onReorder={handleReorder}
        layoutScroll
        className="mx-auto flex max-w-lg touch-none flex-col gap-2"
      >
        {order.map((id, index) => {
          const step = stepMap.get(id)!;
          const isCorrectPos = completed || id === CORRECT_ORDER[index];

          return (
            <Reorder.Item
              key={id}
              value={id}
              drag={!completed}
              tabIndex={completed ? -1 : 0}
              aria-label={`${step.title}, position ${index + 1} of ${order.length}`}
              onKeyDown={(event: KeyboardEvent<HTMLLIElement>) => handleRowKeyDown(index, event)}
              whileDrag={
                cinematic && !completed
                  ? { scale: 1.03, boxShadow: "0 20px 50px rgba(0,0,0,0.45)" }
                  : undefined
              }
              className={cn(
                "lp-flow-chip flex select-none items-center gap-3 rounded-2xl border px-3 py-3",
                completed
                  ? "cursor-default"
                  : "cursor-grab touch-none active:cursor-grabbing",
                completed && isCorrectPos
                  ? "border-emerald-400/40 bg-emerald-950/40"
                  : "border-white/10 bg-black/40 hover:border-white/20",
              )}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[11px] font-black leading-none text-indigo-200/80"
                aria-hidden
              >
                ⋮⋮
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-black text-indigo-200">
                {completed ? (
                  <motion.span
                    key={`${id}-num`}
                    initial={{ opacity: 0, scale: 0.6, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ ...springSoft, delay: index * 0.12 }}
                  >
                    {step.number}
                  </motion.span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500">?</span>
                )}
              </span>
              <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-xl pointer-events-none">
                <Image
                  src={step.icon}
                  alt=""
                  fill
                  draggable={false}
                  className="pointer-events-none object-cover"
                  sizes="40px"
                  quality={65}
                />
              </span>
              <span className="text-sm font-bold text-white">{step.title}</span>
              {completed && isCorrectPos ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={springSoft}
                  className="ml-auto text-[10px] font-bold uppercase tracking-wide text-emerald-300"
                >
                  Locked
                </motion.span>
              ) : (
                <span className="ml-auto text-[10px] font-medium text-slate-500">Drag</span>
              )}
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      <div className="mt-4 flex justify-center">
        {completed ? (
          <motion.button
            type="button"
            onClick={reset}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="cursor-pointer rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-white/15"
          >
            Shuffle and play again
          </motion.button>
        ) : (
          <p className="text-center text-[10px] text-slate-500">
            Drag a row into place, or focus it and use ↑ ↓.
          </p>
        )}
      </div>
    </div>
  );
}

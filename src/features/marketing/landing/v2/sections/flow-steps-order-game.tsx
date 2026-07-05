"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { motion, Reorder } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { LandingSpeechBubble } from "@/features/marketing/landing/v2/motion/landing-speech-bubble";
import { useLandingMotion } from "@/features/marketing/landing/v2/motion/use-landing-motion";
import { springSoft } from "@/features/marketing/landing/v2/motion/landing-motion";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";
import { LANDING_FLOW_GAME } from "@/features/marketing/landing/landing-copy-pure";
import { LandingStickyGameNote } from "@/features/marketing/landing/ui/landing-sticky-note";

const STEPS: { id: StepId; number: string; vocabIcon: VocabIconName; title: string }[] = [
  { id: "book", number: "01", vocabIcon: "flow-book", title: "Book" },
  { id: "meet", number: "02", vocabIcon: "flow-meet", title: "Meet" },
  { id: "unpack", number: "03", vocabIcon: "flow-unpack", title: "Unpack" },
  { id: "climb", number: "04", vocabIcon: "flow-climb", title: "Climb" },
];

type StepId = "book" | "meet" | "unpack" | "climb";

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
    message: LANDING_FLOW_GAME.start,
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
      setCoach({ message: LANDING_FLOW_GAME.success, tone: "success" });
    } else {
      setCoach({ message: LANDING_FLOW_GAME.retry, tone: "error" });
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
    setCoach({
      message: LANDING_FLOW_GAME.start,
      tone: "coach",
    });
  }, []);

  return (
    <LandingStickyGameNote variant="taped" className="relative mt-10 rotate-[0.2deg]">
      <LandingSpeechBubble message={coach.message} tone={coach.tone} label={LANDING_FLOW_GAME.label} className="mx-auto mb-4 text-[13px]" />

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
                  ? { scale: 1.03, boxShadow: "0 12px 28px rgba(11,18,32,0.18)" }
                  : undefined
              }
              className={cn(
                "lp-flow-chip flex select-none items-center gap-3 rounded-xl border px-3 py-3",
                completed ? "cursor-default" : "cursor-grab touch-none active:cursor-grabbing",
                completed && isCorrectPos
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-[#A5B4FC] bg-white hover:border-[#6366F1]",
              )}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C4B5FD] bg-[#EDE9FE] text-[11px] font-black leading-none text-[#4F46E5]"
                aria-hidden
              >
                ⋮⋮
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C4B5FD] bg-[#EDE9FE] text-xs font-black text-[#4F46E5]">
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
                  <span className={`text-[10px] font-bold ${landingHub.hint}`}>?</span>
                )}
              </span>
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#A5B4FC] bg-[#EDE9FE] pointer-events-none">
                <MentrixaVocabIcon name={step.vocabIcon} size={22} surface="light" title={step.title} />
              </span>
              <span className="text-sm font-bold text-[#0B1220]">{step.title}</span>
              {completed && isCorrectPos ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={springSoft}
                  className="ml-auto text-[10px] font-bold uppercase tracking-wide text-emerald-700"
                >
                  {LANDING_FLOW_GAME.lockedChip}
                </motion.span>
              ) : (
                <span className={`ml-auto text-[10px] font-medium ${landingHub.hint}`}>{LANDING_FLOW_GAME.dragChip}</span>
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
            className={cn("cursor-pointer rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide", landingHub.btnSecondary)}
          >
            {LANDING_FLOW_GAME.shuffleAgain}
          </motion.button>
        ) : (
          <p className={`text-center ${landingHub.hint}`}>{LANDING_FLOW_GAME.dragHint}</p>
        )}
      </div>
    </LandingStickyGameNote>
  );
}

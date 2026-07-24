"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { cn } from "@/shared/core/utils";

/** Positive y = tucked inside envelope. 0 = letter fully pulled out. */
const Y_TUCKED = 520;
const Y_OUT = 0;
/** Must pull past this (from tucked) before snap opens. */
const OPEN_THRESHOLD = Y_TUCKED * 0.42;

/**
 * Starts closed: only a letter peek shows.
 * Drag the peek up to open the envelope; drag down to tuck it closed again.
 */
export function QuestPackCompleteLetter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const y = useMotionValue(Y_TUCKED);
  const [isOut, setIsOut] = useState(false);

  const flapRotateX = useTransform(y, [Y_TUCKED, Y_OUT], [0, -155]);
  const hintOpacity = useTransform(y, [Y_TUCKED, Y_TUCKED - 70], [1, 0]);

  function setOpen(open: boolean) {
    const target = open ? Y_OUT : Y_TUCKED;
    void animate(y, target, {
      type: reduceMotion ? "tween" : "spring",
      duration: reduceMotion ? 0.2 : undefined,
      stiffness: 340,
      damping: 30,
    });
    setIsOut(open);
  }

  function snapLetter(_: unknown, info: PanInfo) {
    const projected = y.get() + info.velocity.y * 0.16;
    // Only open when the user has clearly dragged upward far enough.
    const open = projected <= OPEN_THRESHOLD;
    setOpen(open);
  }

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-2xl px-3 pb-8 pt-4 sm:px-5 sm:pb-10",
        className,
      )}
    >
      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--mx-indigo)]">
        {isOut ? "Drag down to close the envelope" : "Envelope closed. drag the letter up to open"}
      </p>

      {reduceMotion ? (
        <div className="mb-3 flex justify-center">
          <button
            type="button"
            className="rounded-lg border border-[var(--mx-indigo)] bg-violet-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#4F46E5] shadow-[1px_2px_0_var(--mx-navy)]"
            onClick={() => setOpen(!isOut)}
          >
            {isOut ? "Close envelope" : "Open letter"}
          </button>
        </div>
      ) : null}

      <div className="relative mx-auto h-[min(88dvh,44rem)] w-full max-w-[40rem] overflow-hidden">
        {/* Envelope back */}
        <div
          className="absolute inset-x-0 bottom-0 z-[1] h-[13.5rem] rounded-b-[1.2rem] border-2 border-[var(--mx-indigo)] bg-gradient-to-b from-[#A5B4FC] to-[#818CF8] shadow-[4px_7px_0_var(--mx-navy)]"
          aria-hidden
        />

        {/* Letter — always mounts tucked; drag up to open */}
        <motion.div
          drag={reduceMotion ? false : "y"}
          dragConstraints={{ top: Y_OUT, bottom: Y_TUCKED }}
          dragElastic={0.04}
          dragMomentum={false}
          onDragEnd={snapLetter}
          initial={false}
          style={{
            y,
            backgroundImage:
              "linear-gradient(180deg, #F5F3FF 0%, #FFFBF5 14%, #FFFBF5 100%)",
          }}
          whileDrag={reduceMotion ? undefined : { cursor: "grabbing" }}
          className={cn(
            "absolute inset-x-3 z-[5] flex flex-col sm:inset-x-4",
            reduceMotion ? "cursor-default" : "cursor-grab touch-none active:cursor-grabbing",
            "bottom-[9.5rem] h-[min(34rem,72dvh)]",
            "overflow-hidden rounded-[2px] border-2 border-violet-300",
            "shadow-[0_14px_32px_rgba(79,70,229,0.24)]",
            "mx-hub-ruled-lines",
          )}
          aria-label="Mentrixa letter. Drag up to open the envelope, down to close."
        >
          <div className="flex shrink-0 items-center justify-between border-b border-violet-300/80 bg-[#FFFBF5] px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md border border-[var(--mx-indigo)] bg-[var(--mx-violet)] shadow-[1px_1px_0_var(--mx-navy)]">
                <Image
                  src={MENTRIXA_LOGO_PNG}
                  alt=""
                  width={16}
                  height={16}
                  className="object-contain brightness-0 invert"
                  draggable={false}
                />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mx-indigo)]">
                Mentrixa letter
              </span>
            </div>
            <span className="flex flex-col items-center gap-0.5" aria-hidden>
              <span className="h-1 w-8 rounded-full bg-[#A5B4FC]" />
              <span className="h-1 w-5 rounded-full bg-[#C4B5FD]" />
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {children}
          </div>
        </motion.div>

        {/* Closed flap + pocket — letter body stays sealed until dragged up */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[13.5rem]" aria-hidden>
          <div
            className="absolute inset-x-0 bottom-[9.55rem] h-[4rem]"
            style={{ perspective: 900 }}
          >
            <motion.div className="h-full w-full origin-bottom" style={{ rotateX: flapRotateX }}>
              <div
                className="h-full w-full border-x-2 border-t-2 border-[var(--mx-indigo)] bg-gradient-to-b from-[#EDE9FE] to-[#C4B5FD]"
                style={{ clipPath: "polygon(0 100%, 50% 6%, 100% 100%)" }}
              />
            </motion.div>
          </div>

          <div className="pointer-events-auto absolute inset-x-0 bottom-0 h-[9.75rem] overflow-hidden rounded-b-[1.15rem] border-2 border-t-[var(--mx-violet)]/40 border-[var(--mx-indigo)] bg-gradient-to-b from-[#DDD6FE] via-[#C4B5FD] to-[var(--color-violet-400)]">
            <div className="absolute inset-x-5 top-0 h-px bg-white/60" />
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
              <span className="flex size-12 items-center justify-center rounded-full border-2 border-[var(--mx-violet)] bg-white shadow-[2px_2px_0_var(--mx-navy)]">
                <Image
                  src={MENTRIXA_LOGO_PNG}
                  alt=""
                  width={28}
                  height={28}
                  className="object-contain"
                  draggable={false}
                />
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4F46E5]">
                Mentrixa
              </span>
            </div>
          </div>
        </div>

        {!isOut ? (
          <motion.div
            className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2"
            style={{ bottom: "13.65rem", opacity: hintOpacity }}
          >
            <span className="whitespace-nowrap rounded-full border border-[var(--mx-indigo)] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mx-violet)] shadow-[1px_2px_0_var(--mx-navy)]">
              Drag letter up
            </span>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

/** Stop letter drag from stealing button / link clicks. */
export function letterInteractiveProps() {
  return {
    onPointerDown: (event: PointerEvent) => {
      event.stopPropagation();
    },
  } as const;
}

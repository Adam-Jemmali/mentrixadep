"use client";

import { useEffect, useState, type PointerEvent, type ReactNode } from "react";
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

/** Positive y = pushed down into the envelope (tucked). 0 = letter fully out. */
const Y_TUCKED = 410;
const Y_OUT = 0;

/**
 * Closed Mentrixa envelope with a letter peeking out the top.
 * Drag up to pull the letter out; drag down to tuck it back in.
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

  const flapOpen = useTransform(y, [Y_TUCKED, Y_OUT], [0, 1]);
  const flapRotateX = useTransform(flapOpen, [0, 1], [0, -150]);
  const hintOpacity = useTransform(y, [Y_TUCKED, Y_TUCKED - 50], [1, 0]);

  useEffect(() => {
    if (!reduceMotion) return;
    void animate(y, Y_OUT, { type: "spring", stiffness: 280, damping: 26 });
    setIsOut(true);
  }, [reduceMotion, y]);

  function snapLetter(_: unknown, info: PanInfo) {
    const projected = y.get() + info.velocity.y * 0.18;
    const open = projected < Y_TUCKED * 0.55;
    const target = open ? Y_OUT : Y_TUCKED;
    void animate(y, target, { type: "spring", stiffness: 340, damping: 30 });
    setIsOut(open);
  }

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-md px-3 pb-8 pt-4 sm:px-4 sm:pb-10",
        className,
      )}
    >
      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#6366F1]">
        {isOut ? "Drag down to tuck into envelope" : "Closed envelope · drag letter up"}
      </p>

      <div className="relative mx-auto h-[min(84dvh,40rem)] w-full max-w-[22.5rem] overflow-hidden">
        {/* Envelope back */}
        <div
          className="absolute inset-x-0 bottom-0 z-[1] h-[13rem] rounded-b-[1.2rem] border-2 border-[#6366F1] bg-gradient-to-b from-[#A5B4FC] to-[#818CF8] shadow-[4px_7px_0_#0B1220]"
          aria-hidden
        />

        {/* Letter — starts tucked (y=300); drag toward y=0 to pull out */}
        <motion.div
          drag="y"
          dragConstraints={{ top: Y_OUT, bottom: Y_TUCKED }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={snapLetter}
          style={{
            y,
            backgroundImage:
              "linear-gradient(180deg, #F5F3FF 0%, #FFFBF5 14%, #FFFBF5 100%)",
          }}
          whileDrag={{ cursor: "grabbing" }}
          className={cn(
            "absolute inset-x-[0.7rem] z-[5] flex cursor-grab touch-none flex-col active:cursor-grabbing",
            // Rests on the envelope mouth; tucking pushes it down behind the pocket
            "bottom-[9.25rem] h-[min(32rem,68dvh)]",
            "overflow-hidden rounded-[2px] border-2 border-[#A5B4FC]",
            "shadow-[0_14px_32px_rgba(79,70,229,0.24)]",
            "mx-hub-ruled-lines",
          )}
          aria-label="Mentrixa letter. Drag up to pull out of the envelope, down to tuck."
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#C4B5FD]/80 bg-[#FFFBF5] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md border border-[#6366F1] bg-[#7C3AED] shadow-[1px_1px_0_#0B1220]">
                <Image
                  src={MENTRIXA_LOGO_PNG}
                  alt=""
                  width={16}
                  height={16}
                  className="object-contain brightness-0 invert"
                  draggable={false}
                />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6366F1]">
                Mentrixa letter
              </span>
            </div>
            <span className="flex flex-col items-center gap-0.5" aria-hidden>
              <span className="h-1 w-8 rounded-full bg-[#A5B4FC]" />
              <span className="h-1 w-5 rounded-full bg-[#C4B5FD]" />
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            {children}
          </div>
        </motion.div>

        {/* Front of envelope: closed flap + pocket (pocket blocks letter body while tucked) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[13rem]" aria-hidden>
          <div
            className="absolute inset-x-0 bottom-[9.35rem] h-[3.7rem]"
            style={{ perspective: 900 }}
          >
            <motion.div className="h-full w-full origin-bottom" style={{ rotateX: flapRotateX }}>
              <div
                className="h-full w-full border-x-2 border-t-2 border-[#6366F1] bg-gradient-to-b from-[#EDE9FE] to-[#C4B5FD]"
                style={{ clipPath: "polygon(0 100%, 50% 6%, 100% 100%)" }}
              />
            </motion.div>
          </div>

          {/* Pocket face — blocks CTAs until the letter is pulled high enough */}
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 h-[9.5rem] overflow-hidden rounded-b-[1.15rem] border-2 border-t-[#7C3AED]/40 border-[#6366F1] bg-gradient-to-b from-[#DDD6FE] via-[#C4B5FD] to-[#A78BFA]">
            <div className="absolute inset-x-5 top-0 h-px bg-white/60" />
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
              <span className="flex size-12 items-center justify-center rounded-full border-2 border-[#7C3AED] bg-white shadow-[2px_2px_0_#0B1220]">
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

        <motion.div
          className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2"
          style={{ bottom: "13.15rem", opacity: hintOpacity }}
        >
          <span className="whitespace-nowrap rounded-full border border-[#6366F1] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7C3AED] shadow-[1px_2px_0_#0B1220]">
            Drag letter up
          </span>
        </motion.div>
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

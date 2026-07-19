"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import { cn } from "@/shared/core/utils";

/**
 * Mentrixa-branded envelope tray + draggable cream letter for Pack Complete.
 * Envelope stays fixed; letter slides out once, then can be dragged until a CTA navigates away.
 */
export function QuestPackCompleteLetter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  return (
    <div
      ref={constraintsRef}
      className={cn(
        "relative mx-auto flex min-h-[min(72dvh,40rem)] w-full max-w-lg items-end justify-center px-3 pb-6 pt-10 sm:px-4 sm:pb-10 sm:pt-14",
        className,
      )}
    >
      {/* Envelope tray — fixed under the letter */}
      <div
        className="pointer-events-none absolute bottom-4 left-1/2 z-0 w-[min(100%,22rem)] -translate-x-1/2 sm:bottom-6"
        aria-hidden
      >
        <div className="relative mx-auto h-28 w-full sm:h-32">
          <div className="absolute inset-x-0 bottom-0 h-[4.75rem] rounded-b-2xl border-2 border-[#6366F1] bg-gradient-to-b from-[#DDD6FE] to-[#C4B5FD] shadow-[3px_5px_0_#0B1220]" />
          <div
            className="absolute inset-x-0 top-2 h-16 origin-top"
            style={{
              clipPath: "polygon(0 0, 50% 72%, 100% 0)",
              background: "linear-gradient(180deg, #EDE9FE 0%, #A5B4FC 100%)",
              borderTop: "2px solid #6366F1",
            }}
          />
          <div className="absolute left-1/2 top-[2.35rem] flex size-9 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#7C3AED] bg-white shadow-[1px_2px_0_#0B1220]">
            <Image
              src={MENTRIXA_LOGO_PNG}
              alt=""
              width={22}
              height={22}
              className="object-contain"
              draggable={false}
            />
          </div>
        </div>
      </div>

      <motion.div
        drag={!reduceMotion}
        dragConstraints={constraintsRef}
        dragElastic={0.12}
        dragMomentum={false}
        initial={
          reduceMotion
            ? { opacity: 1, y: 0, rotate: -1.5 }
            : { opacity: 0.35, y: 96, rotate: 4, scale: 0.94 }
        }
        animate={{ opacity: 1, y: 0, rotate: -1.5, scale: 1 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 260, damping: 22, mass: 0.9 }
        }
        whileDrag={reduceMotion ? undefined : { scale: 1.02, rotate: 0, cursor: "grabbing" }}
        className={cn(
          "relative z-10 w-full max-w-md cursor-grab touch-none select-none active:cursor-grabbing",
          "rounded-sm border-2 border-[#A5B4FC] bg-[#FFFBF5]",
          "shadow-[4px_8px_0_rgba(11,18,32,0.18),0_18px_40px_rgba(99,102,241,0.18)]",
          "mx-hub-ruled-lines",
        )}
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(237,233,254,0.55) 0%, rgba(255,251,245,0.96) 18%, #FFFBF5 100%)",
        }}
      >
        {/* Letter fold / stamp row */}
        <div className="flex items-center justify-between border-b border-[#C4B5FD]/70 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg border border-[#6366F1] bg-[#7C3AED] shadow-[1px_2px_0_#0B1220]">
              <Image
                src={MENTRIXA_LOGO_PNG}
                alt="Mentrixa"
                width={20}
                height={20}
                className="object-contain brightness-0 invert"
                draggable={false}
              />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6366F1]">
              Mentrixa letter
            </span>
          </div>
          <span
            className="h-1.5 w-10 rounded-full bg-[#C4B5FD]"
            title="Drag letter"
            aria-hidden
          />
        </div>

        <div className="px-4 py-5 sm:px-5 sm:py-6">{children}</div>
      </motion.div>
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

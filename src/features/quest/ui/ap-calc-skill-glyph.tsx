"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import {
  apCalcSkillVisual,
  apCalcSkillVisualAccentClass,
} from "@/features/quest/ap-calc-skill-visual-pure";

export function ApCalcSkillGlyph({
  nodeName,
  nodeSlug,
  unitNumber,
  unitName,
  size = "md",
  surface = "onLight",
  className,
}: {
  nodeName: string;
  nodeSlug?: string;
  unitNumber?: number;
  unitName?: string;
  size?: "sm" | "md" | "lg";
  surface?: "onLight" | "onDark";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const visual = apCalcSkillVisual({ nodeName, nodeSlug, unitNumber, unitName });
  const sizeClass =
    size === "lg"
      ? "size-16 text-base sm:size-[4.5rem] sm:text-lg"
      : size === "sm"
        ? "size-10 text-[10px]"
        : "size-12 text-sm";

  return (
    <motion.span
      aria-hidden
      initial={reduceMotion ? false : { scale: 0.88, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 22 }}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br font-mono font-bold leading-none",
        apCalcSkillVisualAccentClass(visual.accent, surface),
        sizeClass,
        className,
      )}
    >
      {!reduceMotion ? (
        <motion.span
          className={cn(
            "absolute inset-0 rounded-2xl border",
            surface === "onDark" ? "border-white/15" : "border-black/5",
          )}
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
      <span className="relative z-10 px-1 text-center drop-shadow-sm">{visual.glyph}</span>
    </motion.span>
  );
}

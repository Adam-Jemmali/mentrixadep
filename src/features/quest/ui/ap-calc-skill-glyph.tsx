"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/core/utils";
import { SkillConceptIcon } from "@/features/quest/ui/skill-concept-icon";

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
  const iconSize = size === "lg" ? 56 : size === "sm" ? 36 : 44;

  return (
    <motion.span
      initial={reduceMotion ? false : { scale: 0.88, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 22 }}
      className={cn("inline-flex shrink-0", className)}
    >
      <SkillConceptIcon
        nodeName={nodeName}
        nodeSlug={nodeSlug}
        unitNumber={unitNumber}
        unitName={unitName}
        size={iconSize}
        surface={surface}
        title={nodeName}
      />
    </motion.span>
  );
}

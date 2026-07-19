"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/core/utils";

export function SkillTreeEdge({
  path,
  active = false,
  className,
}: {
  path: string;
  active?: boolean;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.path
      d={path}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={active ? 3 : 2}
      strokeDasharray={active ? "9 8" : "5 10"}
      className={cn(
        active ? "text-[#818CF8]" : "text-[#64748B]/55",
        className,
      )}
      initial={false}
      animate={
        reducedMotion
          ? { strokeDashoffset: 0, opacity: active ? 0.95 : 0.6 }
          : {
              strokeDashoffset: active ? [0, -34] : [0, -30],
              opacity: active ? [0.72, 1, 0.72] : [0.4, 0.68, 0.4],
            }
      }
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              duration: active ? 2.4 : 5.5,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }
      }
      aria-hidden
    />
  );
}

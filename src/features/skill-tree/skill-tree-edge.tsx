"use client";

import { motion } from "@/shared/animation/motion";
import { useHydrationSafeMotion } from "@/shared/animation/use-hydration-safe-motion";
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
  const { safeReduceMotion } = useHydrationSafeMotion();

  const pathClassName = cn(
    active ? "text-[#818CF8]" : "text-[#64748B]/55",
    className,
  );

  if (safeReduceMotion) {
    return (
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={active ? 3 : 2}
        strokeDasharray={active ? "9 8" : "5 10"}
        className={pathClassName}
        opacity={active ? 0.95 : 0.6}
        aria-hidden
      />
    );
  }

  return (
    <motion.path
      d={path}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={active ? 3 : 2}
      strokeDasharray={active ? "9 8" : "5 10"}
      className={pathClassName}
      initial={false}
      animate={{
        strokeDashoffset: active ? [0, -34] : [0, -30],
        opacity: active ? [0.72, 1, 0.72] : [0.4, 0.68, 0.4],
      }}
      transition={{
        duration: active ? 2.4 : 5.5,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
      aria-hidden
    />
  );
}

"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/core/utils";

export type MentrixaMetaTagTone = "light" | "dark";
export type MentrixaMetaTagVariant = "skill" | "exam_stakes" | "quest_kind" | "verified";

export function MentrixaMetaTag({
  variant,
  tone = "light",
  children,
  className,
  animate = true,
}: {
  variant: MentrixaMetaTagVariant;
  tone?: MentrixaMetaTagTone;
  children: ReactNode;
  className?: string;
  animate?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shouldAnimate = animate && mounted && reduceMotion !== true;

  const body = (
    <>
      {variant === "exam_stakes" ? <span className="mentrixa-meta-tag__dot" aria-hidden /> : null}
      <span
        className={cn(
          "mentrixa-meta-tag__label",
          variant === "skill" && "mentrixa-meta-tag__label--skill",
        )}
      >
        {children}
      </span>
      <span className="mentrixa-meta-tag__shimmer" aria-hidden />
    </>
  );

  if (!shouldAnimate) {
    return (
      <span
        className={cn(
          "mentrixa-meta-tag",
          `mentrixa-meta-tag--${variant}`,
          `mentrixa-meta-tag--${tone}`,
          className,
        )}
      >
        {body}
      </span>
    );
  }

  return (
    <motion.span
      className={cn(
        "mentrixa-meta-tag",
        `mentrixa-meta-tag--${variant}`,
        `mentrixa-meta-tag--${tone}`,
        className,
      )}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      whileHover={{ y: -1 }}
    >
      {body}
    </motion.span>
  );
}

export function QuestKindMetaTag({
  label,
  tone = "light",
  className,
}: {
  label: string;
  tone?: MentrixaMetaTagTone;
  className?: string;
}) {
  return (
    <MentrixaMetaTag variant="quest_kind" tone={tone} className={className}>
      {label}
    </MentrixaMetaTag>
  );
}

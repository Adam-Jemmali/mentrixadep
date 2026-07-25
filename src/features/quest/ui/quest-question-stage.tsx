"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "@/shared/animation/motion";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/core/utils";

/** Slide transition between quest questions. */
export function QuestQuestionStage({
  questionKey,
  children,
  className,
}: {
  questionKey: string;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={questionKey}
        className={cn("quest-question-card", className)}
        initial={reduceMotion ? false : { x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={reduceMotion ? undefined : { x: -30, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="quest-question-card border-white/10 bg-[var(--mx-navy)] text-white shadow-[0_8px_32px_-8px_rgba(11,18,32,0.55)] [&_.katex]:text-inherit">
          <CardContent className="space-y-6 p-5 sm:p-6">{children}</CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

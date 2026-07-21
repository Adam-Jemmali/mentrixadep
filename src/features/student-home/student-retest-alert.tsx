"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "@/shared/animation/motion";
import type { DueRetestNode } from "@/features/student-home/load-due-retests";
import {
  StudentHomeStickyCard,
} from "@/features/student-home/student-home-sticky-card";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MentrixaVocabIcon, VOCAB_HEADING_ICON_SIZE } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_QUEST_ICON } from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";

const DISMISS_KEY = "mentrixa-home-retest-alert-dismissed";

export function StudentRetestAlert({
  retests,
  staggerIndex = 2,
}: {
  retests: DueRetestNode[];
  staggerIndex?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      const dismissedIds = raw ? (JSON.parse(raw) as string[]) : [];
      const activeIds = retests.map((r) => r.id);
      const allDismissed = activeIds.length > 0 && activeIds.every((id) => dismissedIds.includes(id));
      setDismissed(allDismissed);
    } catch {
      setDismissed(false);
    }
  }, [retests]);

  if (retests.length === 0) return null;

  function dismiss() {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      const prev = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [...new Set([...prev, ...retests.map((r) => r.id)])];
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next.slice(-40)));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  const primary = retests[0]!;
  const href = `/student/quest?focus=${encodeURIComponent(primary.nodeName)}&retest=1`;
  const title =
    retests.length === 1 ? `Retest due: ${primary.nodeName}` : `${retests.length} retests due`;
  const description =
    retests.length === 1
      ? "Your first answer on this node counts for rank."
      : `${primary.nodeName} and ${retests.length - 1} more node${retests.length === 2 ? "" : "s"} need a verified retest.`;

  return (
    <AnimatePresence initial={false}>
      {!dismissed ? (
        <motion.div
          key="retest-alert"
          initial={reduceMotion ? false : { opacity: 0, y: -18, rotate: -1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, y: -12, rotate: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
        >
          <StudentHomeStickyCard variant="clip" icon="retest" title={title} staggerIndex={staggerIndex} className="border-[#7C3AED]/35">
            <p className={mentrixStudent.pageSubtitle}>{description}</p>
            <p className={cn(mentrixStudent.textMutedOnLight, "mt-2 text-xs")}>
              Start the due retest in Quest. First answers only move rank.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <motion.div whileHover={reduceMotion ? undefined : { scale: 1.03 }} whileTap={reduceMotion ? undefined : { scale: 0.97 }}>
                <Link
                  href={href}
                  className={cn(mentrixStudent.hubBtnSolid, "inline-flex cursor-pointer items-center gap-2 text-sm")}
                >
                  <MentrixaVocabIcon
                    name={CANONICAL_QUEST_ICON}
                    size={VOCAB_HEADING_ICON_SIZE * 0.36}
                    surface="light"
                    title="Start retest"
                  />
                  Start retest
                </Link>
              </motion.div>
              <button
                type="button"
                onClick={dismiss}
                className={cn(mentrixStudent.hubGhostLink, "cursor-pointer text-sm")}
              >
                Dismiss
              </button>
            </div>
          </StudentHomeStickyCard>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

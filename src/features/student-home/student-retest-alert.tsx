"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "@/shared/animation/motion";
import { MentrixaAlert } from "@/shared/ui/alert-patterns";
import type { DueRetestNode } from "@/features/student-home/load-due-retests";

const DISMISS_KEY = "mentrixa-home-retest-alert-dismissed";

export function StudentRetestAlert({ retests }: { retests: DueRetestNode[] }) {
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

  return (
    <AnimatePresence initial={false}>
      {!dismissed ? (
        <motion.div
          key="retest-alert"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
        >
          <MentrixaAlert
            tone="dark"
            status="accent"
            title={
              retests.length === 1
                ? `Retest due: ${primary.nodeName}`
                : `${retests.length} retests due`
            }
            description={
              retests.length === 1
                ? "Your first answer on this node counts for rank."
                : `${primary.nodeName} and ${retests.length - 1} more node${retests.length === 2 ? "" : "s"} need a verified retest.`
            }
            nextAction="Start the due retest in Quest."
            className="border-[var(--mx-primary)]/60"
            action={
              <div className="flex flex-wrap gap-2">
                <Link
                  href={href}
                  className="inline-flex rounded-md bg-[var(--mx-primary)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--mx-primary-hover)]"
                >
                  Start retest
                </Link>
                <button
                  type="button"
                  onClick={dismiss}
                  className="inline-flex rounded-md px-3 py-1.5 text-sm font-medium text-[var(--mx-muted)] hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            }
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

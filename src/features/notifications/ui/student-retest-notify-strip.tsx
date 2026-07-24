"use client";

import Link from "next/link";
import { useTransition } from "react";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import { BeforeAfterCard } from "@/features/share/before-after-card";
import { PROOF_CARD_COPY } from "@/features/share/before-after-card-pure";
import type { StudentRetestProofNotification } from "@/features/notifications/student-retest-notifications";
import { markStudentRetestNotificationRead } from "@/features/notifications/student-retest-notifications";
import { StudentHomeAnimatedSticky } from "@/features/student-home/student-home-animated-sticky";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { CANONICAL_BREAKTHROUGH_ICON } from "@/shared/icons/vocab-canonical";
import { cn } from "@/shared/core/utils";

export function StudentRetestNotifyStrip({
  items,
  staggerIndex = 0,
}: {
  items: StudentRetestProofNotification[];
  staggerIndex?: number;
}) {
  const [pending, startTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  if (items.length === 0) return null;

  const first = items[0]!;
  const shareHref = first.shareHref;

  return (
    <section id="retest-proof" className="scroll-mt-24">
      <StudentHomeAnimatedSticky variant="curl" staggerIndex={staggerIndex}>
        <motion.div
          initial={reduceMotion ? false : { x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <MentrixaVocabIcon
              name={CANONICAL_BREAKTHROUGH_ICON}
              size={18}
              gold
              surface="light"
              title="Retest proof"
            />
            <p className="text-sm font-bold text-[var(--mx-navy)]">Retest proof</p>
          </div>

          <BeforeAfterCard
            mode="inline"
            nodeName={first.nodeName}
            beforeAccuracy={first.beforeAccuracy}
            afterAccuracy={first.afterAccuracy}
            guideName={first.guideName ?? undefined}
            date={new Date(first.createdAt)}
            rankUsername={first.rankUsername}
          />

          {shareHref ? (
            <div className="mt-4 flex justify-center">
              <Link
                href={shareHref}
                onClick={() => {
                  startTransition(async () => {
                    await markStudentRetestNotificationRead(first.id);
                  });
                }}
                className={cn(
                  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full",
                  "bg-[var(--mx-violet)] px-6 py-2.5 text-sm font-bold text-white",
                  "shadow-[0_12px_28px_-12px_rgba(124,58,237,0.65)] transition-colors hover:bg-[var(--mx-primary-hover)]",
                  pending && "opacity-70",
                )}
              >
                <MentrixaVocabIcon name="share" size={16} surface="dark" title="Share" />
                {PROOF_CARD_COPY.shareCta}
              </Link>
            </div>
          ) : null}
        </motion.div>
      </StudentHomeAnimatedSticky>
    </section>
  );
}

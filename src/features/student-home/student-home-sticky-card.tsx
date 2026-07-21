"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "@/shared/animation/motion";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
import { StudentHomeAnimatedSticky } from "@/features/student-home/student-home-animated-sticky";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MentrixaVocabIcon, VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import { cn } from "@/shared/core/utils";

export const HOME_MOUNT_PANEL_CLASS = "home-mount-panel";

export function StudentHomeStickyCard({
  variant = "curl",
  icon,
  title,
  href,
  linkLabel,
  gold,
  children,
  className,
  headerClassName,
  staggerIndex = 0,
}: {
  variant?: LandingStickyVariant;
  icon: VocabIconName;
  title: string;
  href?: string;
  linkLabel?: string;
  gold?: boolean;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  staggerIndex?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <StudentHomeAnimatedSticky variant={variant} className={className} staggerIndex={staggerIndex}>
      <motion.header
        className={cn("mb-4 flex items-start justify-between gap-3", headerClassName)}
        initial={reduceMotion ? false : { opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: staggerIndex * 0.12 + 0.18, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <VocabSectionHeading name={icon} label={title} surface="light" gold={gold} as="h2" />
        {href && linkLabel ? (
          <Link
            href={href}
            className={cn(
              mentrixStudent.hubGhostLink,
              "shrink-0 cursor-pointer text-[10px] font-bold uppercase tracking-[0.12em]",
            )}
          >
            {linkLabel}
          </Link>
        ) : null}
      </motion.header>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: staggerIndex * 0.12 + 0.28, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </StudentHomeAnimatedSticky>
  );
}

export function StudentHomeEmptyInvite({
  message,
  actionLabel,
  actionHref,
  icon,
}: {
  message: string;
  actionLabel: string;
  actionHref: string;
  icon: VocabIconName;
}) {
  return (
    <div className={cn(mentrixStudent.hubEmpty, "space-y-4 py-8 text-center")}>
      <MentrixaVocabIcon name={icon} size={44} surface="light" title={message} className="mx-auto" />
      <p className={mentrixStudent.pageSubtitle}>{message}</p>
      <Link href={actionHref} className={cn(mentrixStudent.hubBtnSolid, "cursor-pointer text-sm")}>
        {actionLabel}
      </Link>
    </div>
  );
}

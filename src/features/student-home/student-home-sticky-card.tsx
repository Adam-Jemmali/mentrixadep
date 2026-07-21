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
  compact = true,
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
  compact?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <StudentHomeAnimatedSticky
      variant={variant}
      compact={compact}
      className={className}
      staggerIndex={staggerIndex}
    >
      <motion.header
        className={cn(
          compact ? "mb-2 flex items-center justify-between gap-2" : "mb-4 flex items-start justify-between gap-3",
          headerClassName,
        )}
        initial={reduceMotion ? false : { opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: staggerIndex * 0.07 + 0.12, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <VocabSectionHeading
          name={icon}
          label={title}
          surface="light"
          gold={gold}
          as="h2"
          iconSize={compact ? 32 : undefined}
        />
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
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: staggerIndex * 0.07 + 0.2, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
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
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn(mentrixStudent.hubEmpty, "space-y-2.5 px-4 py-4 text-center")}>
      {reduceMotion ? (
        <MentrixaVocabIcon name={icon} size={36} surface="light" title={message} className="mx-auto" />
      ) : (
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <MentrixaVocabIcon name={icon} size={36} surface="light" title={message} className="mx-auto" />
        </motion.div>
      )}
      <p className="text-sm font-medium leading-snug text-[#475569]">{message}</p>
      <Link
        href={actionHref}
        className={cn(mentrixStudent.hubBtnSolid, "inline-flex cursor-pointer items-center gap-1.5 text-sm")}
      >
        <MentrixaVocabIcon name={icon} size={16} surface="light" title={actionLabel} />
        {actionLabel}
      </Link>
    </div>
  );
}

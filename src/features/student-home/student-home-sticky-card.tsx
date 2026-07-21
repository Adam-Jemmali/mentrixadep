"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
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
}) {
  return (
    <StudentStickyNote variant={variant} className={cn(HOME_MOUNT_PANEL_CLASS, className)}>
      <header className={cn("mb-4 flex items-start justify-between gap-3", headerClassName)}>
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
      </header>
      {children}
    </StudentStickyNote>
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

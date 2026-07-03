"use client";

import Link from "next/link";
import { cn } from "@/shared/core/utils";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  CANONICAL_BOOKING_ICON,
  CANONICAL_SESSION_ICON,
} from "@/shared/icons/vocab-canonical";

export function StudentHeroQuickActions({ className }: { className?: string }) {
  return (
    <nav
      className={cn("flex shrink-0 flex-wrap items-center justify-end gap-2", className)}
      aria-label="Book a guide or open sessions"
    >
      <Link href="#browse-guides" className={mentrixStudent.hubBtnChip} title="Browse and book a guide">
        <MentrixaVocabIcon name={CANONICAL_BOOKING_ICON} size={28} surface="light" title="Book guide" />
        <span className="max-w-[5.5rem] text-center leading-tight">Book Guide</span>
      </Link>
      <Link href="#sessions-history" className={mentrixStudent.hubBtnChip} title="Open your sessions">
        <MentrixaVocabIcon name={CANONICAL_SESSION_ICON} size={28} surface="light" title="Sessions" />
        <span className="max-w-[5.5rem] text-center leading-tight">Sessions</span>
      </Link>
    </nav>
  );
}

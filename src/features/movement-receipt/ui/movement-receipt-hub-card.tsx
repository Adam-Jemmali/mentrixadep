"use client";

import Link from "next/link";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { StudentStickyNote } from "@/features/student-profile/ui/student-sticky-note";
import {
  MentrixaVocabIcon,
  VocabSectionHeading,
  VocabStatColumn,
  vocabTwoWordLabel,
} from "@/shared/icons/mentrixa-vocab-icons";
import type { VocabIconName } from "@/shared/icons/mentrixa-vocab-map";
import {
  CANONICAL_DUELS_ICON,
  CANONICAL_QUEST_ICON,
  CANONICAL_RECEIPT_ICON,
  CANONICAL_BOOKING_ICON,
} from "@/shared/icons/vocab-canonical";
import type { MovementReceiptData } from "@/features/movement-receipt/types";
import {
  buildMovementReceiptDetailLines,
  buildMovementReceiptVerdict,
  isGridDetailLine,
  stripGridMovementFromVerdict,
} from "@/features/movement-receipt/movement-receipt-pure";
import { GridMovementVisual } from "@/features/movement-receipt/ui/grid-movement-visual";

type MovementReceiptHubCardProps = {
  data: MovementReceiptData;
  momentumActive: boolean;
  compact?: boolean;
};

function IconLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: VocabIconName;
  label: string;
}) {
  const caption = vocabTwoWordLabel(label);

  return (
    <Link href={href} className={mentrixStudent.hubBtnChip} title={caption}>
      <MentrixaVocabIcon name={icon} size={32} surface="light" title={caption} />
      <span className="max-w-[5.5rem] text-center text-[9px] font-black uppercase leading-tight tracking-[0.1em] text-[#4F46E5]">
        {caption}
      </span>
    </Link>
  );
}

export function MovementReceiptHubCard({ data, momentumActive, compact = false }: MovementReceiptHubCardProps) {
  const { verdict, nextAction, ctaHref, ctaLabel } = buildMovementReceiptVerdict(data);
  const supplementalVerdict = stripGridMovementFromVerdict(verdict, data.grid);
  const detailLines = momentumActive
    ? buildMovementReceiptDetailLines(data).filter((line) => !isGridDetailLine(line))
    : [];

  const ctaIcon: VocabIconName = ctaHref.includes("quest")
    ? CANONICAL_QUEST_ICON
    : ctaHref.includes("duel")
      ? CANONICAL_DUELS_ICON
      : CANONICAL_BOOKING_ICON;
  const ctaCaption = vocabTwoWordLabel(ctaLabel);

  return (
    <StudentStickyNote variant="clip">
      <section aria-label="Movement receipt">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <VocabSectionHeading
          name={CANONICAL_RECEIPT_ICON}
          label="Weekly Receipt"
          surface="light"
          iconSize={compact ? 36 : undefined}
          labelClassName="text-[#6366F1]"
        />
        <VocabStatColumn
          icon="receipt"
          label="This Week"
          value={data.weekStart}
          accent="indigo"
          surface="light"
          iconSize={compact ? 24 : 28}
          valueClassName="text-[10px] font-bold tabular-nums sm:text-xs"
        />
      </div>
      <div className="mt-3">
        <GridMovementVisual grid={data.grid} surface="light" />
      </div>

      <p className="sr-only">
        {supplementalVerdict} {nextAction}
      </p>

      {detailLines.length > 0 ? (
        <ul className="sr-only">
          {detailLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Link href={ctaHref} className={mentrixStudent.hubBtn} title={ctaCaption}>
          <MentrixaVocabIcon name={ctaIcon} size={32} surface="dark" title={ctaCaption} />
          <span className="max-w-[5.5rem] text-center text-[9px] font-black uppercase leading-tight tracking-[0.1em]">
            {ctaCaption}
          </span>
        </Link>

        {momentumActive ? (
          <>
            <IconLink href="/student/receipts" icon="receipt" label="All Receipts" />
            <IconLink href="/student/briefs" icon="brief" label="All Briefs" />
            <IconLink href="/student/mastery" icon="mastery-grid" label="Skill Grid" />
          </>
        ) : null}
      </div>
      </section>
    </StudentStickyNote>
  );
}

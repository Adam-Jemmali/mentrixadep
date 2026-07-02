"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { MovementReceiptData } from "@/features/movement-receipt/types";
import {
  buildMovementReceiptDetailLines,
  buildMovementReceiptVerdict,
} from "@/features/movement-receipt/movement-receipt-pure";

type MovementReceiptHubCardProps = {
  data: MovementReceiptData;
  momentumActive: boolean;
};

export function MovementReceiptHubCard({ data, momentumActive }: MovementReceiptHubCardProps) {
  const { verdict, nextAction, ctaHref, ctaLabel } = buildMovementReceiptVerdict(data);
  const detailLines = momentumActive ? buildMovementReceiptDetailLines(data) : [];

  return (
    <section className={`${mentrixStudent.card} p-5 sm:p-6`} aria-label="Movement receipt">
      <p className={`${mentrixStudent.sectionEyebrowOnLight} inline-flex items-center gap-2`}>
        <MentrixaVocabIcon name="movement-receipt" size={16} surface="light" title="Movement receipt" />
        Movement receipt
      </p>
      <p className="mt-1 text-xs text-zinc-500">Week of {data.weekStart}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{verdict}</p>
      <p className="mt-1 text-sm text-zinc-600">{nextAction}</p>

      {detailLines.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-sm text-zinc-700">
          {detailLines.map((line) => (
            <li key={line} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild size="sm">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
        {momentumActive ? (
          <>
            <Button asChild size="sm" variant="outline">
              <Link href="/student/receipts" className="inline-flex items-center gap-1.5">
                <MentrixaVocabIcon name="receipt" size={14} surface="light" title="Receipt archive" />
                Receipt archive
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/student/briefs">Brief archive</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/student/mastery">Mastery timeline</Link>
            </Button>
          </>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href="/student/subscribe">Get weekly receipt by email</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

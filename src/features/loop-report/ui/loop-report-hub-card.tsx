"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { LoopReportRow } from "@/features/intervention-retests/retest-reads";
import {
  buildLoopReportHubVerdict,
  buildLoopReportRowVerdict,
} from "@/features/loop-report/loop-report-pure";

type LoopReportHubCardProps = {
  rows: LoopReportRow[];
  momentumActive: boolean;
};

export function LoopReportHubCard({ rows, momentumActive }: LoopReportHubCardProps) {
  const { verdict, nextAction } = buildLoopReportHubVerdict(rows);

  return (
    <section className={`${mentrixStudent.card} p-5 sm:p-6`} aria-label="Loop report">
      <p className={`${mentrixStudent.sectionEyebrowOnLight} inline-flex items-center gap-2`}>
        <MentrixaVocabIcon name="loop-report" size={16} title="Loop report" />
        Loop report
      </p>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{verdict}</p>
      <p className="mt-1 text-sm text-zinc-600">{nextAction}</p>

      {momentumActive && rows.length > 1 ? (
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          {rows.slice(0, 5).map((row) => (
            <li key={row.id} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              {buildLoopReportRowVerdict(row)}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild size="sm">
          <Link href="/student/loop">Open Loop Report</Link>
        </Button>
        {!momentumActive ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/student/subscribe">Unlock full history</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

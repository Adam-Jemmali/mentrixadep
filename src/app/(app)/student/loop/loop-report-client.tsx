"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { LoopReportRow } from "@/features/intervention-retests/retest-reads";
import {
  buildLoopReportNextAction,
  buildLoopReportRowVerdict,
} from "@/features/loop-report/loop-report-pure";

import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";

export function LoopReportPageClient({
  rows,
  momentumActive,
}: {
  rows: LoopReportRow[];
  momentumActive: boolean;
}) {
  return (
    <div className={mentrixStudent.pageBgHub}>
      <main className={`${mentrixStudent.main} space-y-6`}>
        <div>
          <Link href="/student" className="text-sm text-violet-300 hover:text-violet-100">
            Back to hub
          </Link>
          <VocabSectionHeading
            name="loop-report"
            label="Loop Report"
            surface="dark"
            as="h1"
            className="mt-2"
            labelClassName="text-xl font-black normal-case tracking-tight text-white sm:text-2xl"
          />
          <p className="mt-1 text-sm text-violet-200/85">
            Every retest scheduled from sessions, breakthroughs, and duels.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className={`${mentrixStudent.card} p-6 text-sm text-zinc-700`}>
            No loops yet. Complete a Guide session or duel to schedule your first retest.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className={`${mentrixStudent.card} p-5`}>
                <p className="text-sm font-semibold text-zinc-900">{buildLoopReportRowVerdict(row)}</p>
                <p className="mt-1 text-sm text-zinc-600">{buildLoopReportNextAction(row)}</p>
              </li>
            ))}
          </ul>
        )}

        {!momentumActive ? (
          <div className={`${mentrixStudent.card} p-5`}>
            <p className="text-sm text-zinc-700">
              Free accounts see the latest loop row on the hub. Momentum unlocks full Loop Report history.
            </p>
            <Button asChild className="mt-3" size="sm">
              <Link href="/student/subscribe">Upgrade to Momentum</Link>
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

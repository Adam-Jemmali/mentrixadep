"use client";

import Link from "next/link";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { MovementReceiptRow } from "@/features/movement-receipt/types";
import {
  buildMovementReceiptDetailLines,
  buildMovementReceiptVerdict,
  isGridDetailLine,
  stripGridMovementFromVerdict,
} from "@/features/movement-receipt/movement-receipt-pure";
import { GridMovementVisual } from "@/features/movement-receipt/ui/grid-movement-visual";
import { VocabSectionHeading } from "@/shared/icons/mentrixa-vocab-icons";

export function ReceiptArchiveClient({
  receipts,
  momentumActive,
}: {
  receipts: MovementReceiptRow[];
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
            name="movement-receipt"
            label="Movement Receipt archive"
            surface="dark"
            as="h1"
            className="mt-2"
            labelClassName="text-xl font-black normal-case tracking-tight text-white sm:text-2xl"
          />
          <p className="mt-1 text-sm text-violet-200/85">
            Weekly verified movement: grid flips, retest loops, session credit, and cohort pace.
          </p>
        </div>

        {!momentumActive ? (
          <div className={`${mentrixStudent.card} p-6 text-sm text-zinc-700`}>
            Your current week receipt stays free on the hub. The full archive and weekly email are included with
            Momentum.
          </div>
        ) : receipts.length === 0 ? (
          <div className={`${mentrixStudent.card} p-6 text-sm text-zinc-700`}>
            Archives appear after your first Monday Movement Receipt is generated.
          </div>
        ) : (
          <ul className="space-y-4">
            {receipts.map((receipt) => {
              const { verdict, nextAction } = buildMovementReceiptVerdict(receipt.receipt_data);
              const supplementalVerdict = stripGridMovementFromVerdict(verdict, receipt.receipt_data.grid);
              const detailLines = buildMovementReceiptDetailLines(receipt.receipt_data).filter(
                (line) => !isGridDetailLine(line),
              );
              return (
                <li key={receipt.id} className={`${mentrixStudent.card} p-5 sm:p-6`}>
                  <VocabSectionHeading name="movement-receipt" label="Movement receipt" surface="light" />
                  <p className="mt-1 text-xs text-zinc-500">Week of {receipt.week_start}</p>
                  <div className="mt-3">
                    <GridMovementVisual grid={receipt.receipt_data.grid} surface="light" />
                  </div>
                  {supplementalVerdict ? (
                    <p className="mt-2 text-sm font-semibold text-zinc-900">{supplementalVerdict}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-zinc-600">{nextAction}</p>
                  {detailLines.length > 0 ? (
                    <ul className="mt-4 space-y-1.5 text-sm text-zinc-700">
                      {detailLines.map((line) => (
                        <li
                          key={line}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

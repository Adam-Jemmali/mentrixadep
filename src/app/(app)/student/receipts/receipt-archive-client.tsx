"use client";

import Link from "next/link";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import type { MovementReceiptRow } from "@/features/movement-receipt/types";
import {
  buildMovementReceiptDetailLines,
  buildMovementReceiptVerdict,
} from "@/features/movement-receipt/movement-receipt-pure";

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
          <h1 className="mt-2 text-2xl font-black text-white">Movement Receipt archive</h1>
          <p className="mt-1 text-sm text-violet-200/85">
            Weekly verified movement: grid flips, retest loops, session credit, and cohort pace.
          </p>
        </div>

        {!momentumActive ? (
          <div className={`${mentrixStudent.card} p-6 text-sm text-zinc-700`}>
            Your current week receipt stays free on the hub. Momentum unlocks the full archive and weekly email.
            <Link href="/student/subscribe" className="ml-1 font-semibold text-indigo-600 underline">
              Upgrade to Momentum
            </Link>
          </div>
        ) : receipts.length === 0 ? (
          <div className={`${mentrixStudent.card} p-6 text-sm text-zinc-700`}>
            Archives appear after your first Monday Movement Receipt is generated.
          </div>
        ) : (
          <ul className="space-y-4">
            {receipts.map((receipt) => {
              const { verdict, nextAction } = buildMovementReceiptVerdict(receipt.receipt_data);
              const detailLines = buildMovementReceiptDetailLines(receipt.receipt_data);
              return (
                <li key={receipt.id} className={`${mentrixStudent.card} p-5 sm:p-6`}>
                  <p className={mentrixStudent.sectionEyebrowOnLight}>Movement receipt</p>
                  <p className="mt-1 text-xs text-zinc-500">Week of {receipt.week_start}</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">{verdict}</p>
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

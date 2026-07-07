"use client";

import Link from "next/link";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { MOMENTUM_MEMBERSHIP_INCLUDED_COPY, MOMENTUM_MEMBERSHIP_UNLOCK_COPY } from "@/features/payments/momentum-membership-pure";
import { MomentumMembershipMemberChip } from "@/features/student-profile/ui/momentum-membership-member-chip";
import { ProductPageHeader } from "@/features/student-profile/ui/product-page-header";
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
        <Link href="/student" className={mentrixStudent.hubGhostLink}>
          ← Back to hub
        </Link>

        <ProductPageHeader
          icon="movement-receipt"
          eyebrow="Archive"
          title="Movement Receipt archive"
          subtitle="Weekly verified movement: grid flips, retest loops, session credit, and cohort pace."
        />

        {!momentumActive ? (
          <div className={`${mentrixStudent.card} p-6 ${mentrixStudent.pageSubtitle}`}>
            Your current week receipt stays free on the hub. The full archive and weekly email are Momentum membership
            features. {MOMENTUM_MEMBERSHIP_INCLUDED_COPY}
          </div>
        ) : receipts.length === 0 ? (
          <div className={`${mentrixStudent.card} p-6 ${mentrixStudent.pageSubtitle}`}>
            <MomentumMembershipMemberChip className="mb-3" />
            Archives appear after your first Monday Movement Receipt is generated.
          </div>
        ) : (
          <>
            <MomentumMembershipMemberChip />
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
                  <p className={`mt-1 text-xs ${mentrixStudent.textMutedOnLight}`}>Week of {receipt.week_start}</p>
                  <div className="mt-3">
                    <GridMovementVisual grid={receipt.receipt_data.grid} surface="light" />
                  </div>
                  {supplementalVerdict ? (
                    <p className="mt-2 text-sm font-semibold text-[#0B1220]">{supplementalVerdict}</p>
                  ) : null}
                  <p className={`mt-1 text-sm ${mentrixStudent.pageSubtitle}`}>{nextAction}</p>
                  {detailLines.length > 0 ? (
                    <ul className={`mt-4 space-y-1.5 text-sm ${mentrixStudent.pageSubtitle}`}>
                      {detailLines.map((line) => (
                        <li
                          key={line}
                          className="rounded-lg border border-[#C4B5FD] bg-[#EDE9FE]/50 px-3 py-2"
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
          </>
        )}
      </main>
    </div>
  );
}

import type { MovementReceiptData } from "@/features/movement-receipt/types";

export type MonthlyMovementRollup = {
  monthLabel: string;
  weeksIncluded: number;
  totalNewVerified: number;
  totalLoopsClosed: number;
  weeksWithUnusedCredit: number;
  verdict: string;
  nextAction: string;
};

export function buildMonthlyMovementRollup(input: {
  firstName: string;
  monthLabel: string;
  receipts: MovementReceiptData[];
}): MonthlyMovementRollup {
  const receipts = input.receipts.slice(0, 4);
  const totalNewVerified = receipts.reduce(
    (sum, receipt) => sum + receipt.grid.newlyVerifiedCount,
    0,
  );
  const totalLoopsClosed = receipts.reduce(
    (sum, receipt) => sum + receipt.loops.completedThisWeek,
    0,
  );
  const weeksWithUnusedCredit = receipts.filter(
    (receipt) => receipt.credit.momentumActive && receipt.credit.creditsRemaining > 0,
  ).length;

  let verdict: string;
  if (totalNewVerified === 0 && totalLoopsClosed === 0) {
    verdict = `${input.firstName}, last month had no verified grid movement recorded in your Movement Receipts.`;
  } else {
    verdict = `${input.firstName}, last month you verified ${totalNewVerified} new node${totalNewVerified === 1 ? "" : "s"} and closed ${totalLoopsClosed} coaching loop${totalLoopsClosed === 1 ? "" : "s"} across ${receipts.length} weekly receipts.`;
  }

  let nextAction: string;
  if (weeksWithUnusedCredit >= 2) {
    nextAction =
      "You left included session credits unused multiple weeks. Book your beat early this month.";
  } else if (totalNewVerified < 2) {
    nextAction = "Take one Quest on an unverified node this week, then book your included session.";
  } else {
    nextAction = "Keep the rhythm: one retest or duel this week, then use your included credit.";
  }

  return {
    monthLabel: input.monthLabel,
    weeksIncluded: receipts.length,
    totalNewVerified,
    totalLoopsClosed,
    weeksWithUnusedCredit,
    verdict,
    nextAction,
  };
}

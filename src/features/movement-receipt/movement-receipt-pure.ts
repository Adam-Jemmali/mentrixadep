import type { MovementReceiptData } from "@/features/movement-receipt/types";
import {
  buildPeerVelocityLine,
  buildPeerVelocityUpsellLine,
} from "@/features/comparison/peer-velocity-pure";

export type MovementReceiptMessages = {
  verdict: string;
  nextAction: string;
  ctaHref: string;
  ctaLabel: string;
};

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

function formatGridMovementLine(grid: MovementReceiptData["grid"]): string {
  if (grid.newlyVerifiedCount === 0 && grid.flippedToWeakCount === 0) {
    return "No new verified nodes on the grid this week.";
  }

  const parts: string[] = [];
  if (grid.newlyVerifiedCount > 0) {
    parts.push(
      `${grid.newlyVerifiedCount} new verified ${plural(grid.newlyVerifiedCount, "node")}`,
    );
  }
  if (grid.flippedToWeakCount > 0) {
    parts.push(
      `${grid.flippedToWeakCount} ${plural(grid.flippedToWeakCount, "node")} slipped to weak`,
    );
  }
  return parts.join("; ") + ".";
}

function formatLoopLine(loops: MovementReceiptData["loops"]): string | null {
  if (loops.completedThisWeek <= 0) return null;
  if (
    loops.latestClosedNodeName &&
    loops.latestPreAccuracy != null &&
    loops.latestPostAccuracy != null
  ) {
    return `${loops.completedThisWeek} closed ${plural(loops.completedThisWeek, "loop")} this week. Latest: ${loops.latestClosedNodeName} moved ${Math.round(loops.latestPreAccuracy * 100)}% → ${Math.round(loops.latestPostAccuracy * 100)}%.`;
  }
  return `${loops.completedThisWeek} closed ${plural(loops.completedThisWeek, "loop")} this week.`;
}

function formatCreditLine(credit: MovementReceiptData["credit"]): string | null {
  if (!credit.momentumActive) return null;
  if (credit.creditsRemaining > 0) {
    return `Included session credit unused (${credit.creditsRemaining} remaining this month).`;
  }
  return "Included session credit used this month.";
}

function appendPeerLine(verdict: string, data: MovementReceiptData): string {
  if (data.peer && data.momentumActive) {
    return `${verdict} ${buildPeerVelocityLine(data.peer)}`;
  }
  return verdict;
}

export function buildMovementReceiptVerdict(data: MovementReceiptData): MovementReceiptMessages {
  const gridLine = formatGridMovementLine(data.grid);
  const loopLine = formatLoopLine(data.loops);
  const creditLine = formatCreditLine(data.credit);

  if (data.retest.nodeName && data.retest.isDue) {
    return {
      verdict: appendPeerLine(`Retest due on ${data.retest.nodeName}. ${gridLine}`, data),
      nextAction: "Open Quest and take the retest now to lock this week's verified movement.",
      ctaHref: "/student/quest",
      ctaLabel: "Take retest",
    };
  }

  if (data.credit.momentumActive && data.credit.creditsRemaining > 0) {
    const retestHint = data.retest.nodeName
      ? ` Priority retest on ${data.retest.nodeName}${data.retest.countdownLabel ? ` unlocks in ${data.retest.countdownLabel}` : " is scheduled"}.`
      : "";
    return {
      verdict: appendPeerLine(`Your included session credit is unused. ${gridLine}${retestHint}`, data),
      nextAction: "Book your included Guide session before the month turns or you lose this coaching beat.",
      ctaHref: "/student/guides",
      ctaLabel: "Book with credit",
    };
  }

  if (data.grid.newlyVerifiedCount > 0) {
    const pace =
      data.grid.priorWeekNewlyVerified > 0 && data.grid.newlyVerifiedCount > data.grid.priorWeekNewlyVerified
        ? ` Up from ${data.grid.priorWeekNewlyVerified} last week.`
        : "";
    const retestHint = data.retest.nodeName
      ? ` Retest on ${data.retest.nodeName}${data.retest.isDue ? " is due now" : data.retest.countdownLabel ? ` unlocks in ${data.retest.countdownLabel}` : " is scheduled"}.`
      : "";
    return {
      verdict: appendPeerLine(`${gridLine}${pace}${loopLine ? ` ${loopLine}` : ""}${retestHint}`, data),
      nextAction:
        data.retest.nodeName && !data.retest.isDue
          ? "Practice the node while you wait, then retest the moment it opens."
          : "Take one retest or duel on a weak node to keep the streak alive.",
      ctaHref: data.retest.nodeName ? "/student/quest" : "/student/mastery",
      ctaLabel: data.retest.nodeName ? "Open Quest" : "View Mastery Grid",
    };
  }

  if (loopLine) {
    return {
      verdict: appendPeerLine(loopLine, data),
      nextAction: data.retest.nodeName
        ? `Complete the retest on ${data.retest.nodeName} to verify the loop closed.`
        : "Book your next Guide session on the node that still will not move.",
      ctaHref: data.retest.nodeName ? "/student/quest" : "/student/guides",
      ctaLabel: data.retest.nodeName ? "Take retest" : "Browse Guides",
    };
  }

  if (data.retest.nodeName) {
    const priority = data.retest.priorityRetest ? "Momentum priority " : "";
    return {
      verdict: appendPeerLine(
        `${priority}Retest on ${data.retest.nodeName}${data.retest.isDue ? " is due now" : data.retest.countdownLabel ? ` unlocks in ${data.retest.countdownLabel}` : " is scheduled"}. ${gridLine}`,
        data,
      ),
      nextAction: data.retest.priorityRetest
        ? "Queue practice now, then retest the moment it opens."
        : "Upgrade to Momentum for half the retest wait, or practice related nodes now.",
      ctaHref: "/student/quest",
      ctaLabel: "Open Quest",
    };
  }

  const creditSuffix = creditLine ? ` ${creditLine}` : "";
  return {
    verdict: appendPeerLine(`${gridLine}${creditSuffix}`, data),
    nextAction: data.credit.momentumActive
      ? "Take a Quest on an unverified node or book your included session when the wall is real."
      : `${buildPeerVelocityUpsellLine()} Upgrade for weekly email and priority retests.`,
    ctaHref: data.credit.momentumActive ? "/student/guides" : "/student/subscribe",
    ctaLabel: data.credit.momentumActive ? "Browse Guides" : "Get Momentum",
  };
}

export function buildMovementReceiptDetailLines(data: MovementReceiptData): string[] {
  const lines: string[] = [];
  lines.push(
    `Grid: ${data.grid.newlyVerifiedCount} new verified · ${data.grid.verifiedTotalCount} total verified`,
  );
  if (data.loops.completedThisWeek > 0) {
    lines.push(`Loops: ${data.loops.completedThisWeek} closed this week`);
  }
  if (data.credit.momentumActive) {
    lines.push(
      data.credit.creditsRemaining > 0
        ? `Credit: ${data.credit.creditsRemaining} included session remaining`
        : "Credit: included session used this month",
    );
  }
  if (data.retest.nodeName) {
    lines.push(
      data.retest.isDue
        ? `Retest: due now on ${data.retest.nodeName}`
        : `Retest: ${data.retest.nodeName}${data.retest.countdownLabel ? ` in ${data.retest.countdownLabel}` : ""}`,
    );
  }
  if (data.peer && data.momentumActive) {
    lines.push(`Cohort: ${buildPeerVelocityLine(data.peer)}`);
  }
  return lines;
}

export function movementReceiptEmailSubject(data: MovementReceiptData): string {
  const hi = data.firstName;
  if (data.grid.newlyVerifiedCount > 0) {
    return `${hi} — ${data.grid.newlyVerifiedCount} new verified ${plural(data.grid.newlyVerifiedCount, "node")} this week`;
  }
  if (data.retest.isDue && data.retest.nodeName) {
    return `${hi} — retest due on ${data.retest.nodeName}`;
  }
  if (data.credit.creditsRemaining > 0) {
    return `${hi} — your included session credit is unused`;
  }
  return `${hi} — your weekly Movement Receipt`;
}

import type { MovementReceiptData } from "@/features/movement-receipt/types";
import {
  buildPeerVelocityLine,
} from "@/features/comparison/peer-velocity-pure";
import { buildLoopSlaReceiptLine } from "@/features/entitlements/loop-sla-pure";
import { buildPackSprintReceiptLine } from "@/features/entitlements/pack-sprint-pure";
import { retestQuestHref, bookGuideWithCreditHref, practiceQuestHref } from "@/features/momentum-hub/momentum-value-equation-pure";

export type MovementReceiptMessages = {
  verdict: string;
  nextAction: string;
  ctaHref: string;
  ctaLabel: string;
};

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

function retestOrPracticeHref(
  nodeName: string,
  skillNodeId: string | null | undefined,
  isDue: boolean,
): string {
  if (skillNodeId) {
    return isDue ? retestQuestHref(nodeName, skillNodeId) : practiceQuestHref(nodeName, skillNodeId);
  }
  return practiceQuestHref(nodeName);
}

export function formatGridMovementLine(grid: MovementReceiptData["grid"]): string {
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

/** Hub UI — drop the grid sentence when icons carry the same facts. */
export function stripGridMovementFromVerdict(
  verdict: string,
  grid: MovementReceiptData["grid"],
): string {
  const gridLine = formatGridMovementLine(grid);
  if (!gridLine) return verdict.trim();
  return verdict
    .replace(gridLine, "")
    .replace(/\.\s*\./g, ".")
    .replace(/^\.\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function isGridDetailLine(line: string): boolean {
  return line.startsWith("Grid:");
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
  if (credit.monthlyCreditsRemaining > 0) {
    return `Included session credit unused (${credit.monthlyCreditsRemaining} remaining this month).`;
  }
  return "Included session credit used this month.";
}

function formatPackSprintLine(packSprint: MovementReceiptData["packSprint"]): string | null {
  if (!packSprint || packSprint.creditsRemaining <= 0) return null;
  return buildPackSprintReceiptLine(packSprint);
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
  const packSprintLine = formatPackSprintLine(data.packSprint);
  const slaLine = data.slaGrant ? buildLoopSlaReceiptLine({ nodeName: data.slaGrant.nodeName }) : null;

  if (slaLine) {
    return {
      verdict: appendPeerLine(`${slaLine} ${gridLine}`, data),
      nextAction: "Book your restored included session on the node that still will not move.",
      ctaHref: bookGuideWithCreditHref(null),
      ctaLabel: "Book make-good session",
    };
  }

  if (data.retest.nodeName && data.retest.isDue) {
    const href = retestOrPracticeHref(data.retest.nodeName, data.retest.skillNodeId, true);
    return {
      verdict: appendPeerLine(`Retest due on ${data.retest.nodeName}. ${gridLine}`, data),
      nextAction: `Tap below — Quest opens ${data.retest.nodeName} retest in ~4 min.`,
      ctaHref: href,
      ctaLabel: `Start retest: ${data.retest.nodeName}`,
    };
  }

  if (data.packSprint && data.packSprint.creditsRemaining > 0) {
    const retestHint = data.retest.nodeName
      ? ` Priority retest on ${data.retest.nodeName}${data.retest.countdownLabel ? ` unlocks in ${data.retest.countdownLabel}` : " is scheduled"}.`
      : "";
    return {
      verdict: appendPeerLine(`${packSprintLine}. ${gridLine}${retestHint}`, data),
      nextAction: "Book a sprint session on the node that still will not move before the pack expires.",
      ctaHref: bookGuideWithCreditHref(null),
      ctaLabel: "Book sprint session",
    };
  }

  if (data.credit.momentumActive && data.credit.monthlyCreditsRemaining > 0) {
    const retestHint = data.retest.nodeName
      ? ` Priority retest on ${data.retest.nodeName}${data.retest.countdownLabel ? ` unlocks in ${data.retest.countdownLabel}` : " is scheduled"}.`
      : "";
    return {
      verdict: appendPeerLine(`Your included session credit is unused. ${gridLine}${retestHint}`, data),
      nextAction: "Book your included Guide session before the month turns or you lose this coaching beat.",
      ctaHref: bookGuideWithCreditHref(null),
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
          ? `Practice ${data.retest.nodeName} until the retest unlocks.`
          : "Take the retest on your weakest open loop.",
      ctaHref: data.retest.nodeName
        ? retestOrPracticeHref(data.retest.nodeName, data.retest.skillNodeId, data.retest.isDue)
        : "/student/mastery",
      ctaLabel: data.retest.nodeName
        ? data.retest.isDue
          ? `Start retest: ${data.retest.nodeName}`
          : `Practice: ${data.retest.nodeName}`
        : "View Mastery Grid",
    };
  }

  if (loopLine) {
    return {
      verdict: appendPeerLine(loopLine, data),
      nextAction: data.retest.nodeName
        ? `Complete the retest on ${data.retest.nodeName} to verify the loop closed.`
        : "Book your next Guide session on the node that still will not move.",
      ctaHref: data.retest.nodeName
        ? retestOrPracticeHref(data.retest.nodeName, data.retest.skillNodeId, data.retest.isDue)
        : bookGuideWithCreditHref(null),
      ctaLabel: data.retest.nodeName
        ? data.retest.isDue
          ? `Start retest: ${data.retest.nodeName}`
          : `Practice: ${data.retest.nodeName}`
        : "Book with credit",
    };
  }

  if (data.retest.nodeName) {
    const priority = data.retest.priorityRetest ? "Momentum priority " : "";
    return {
      verdict: appendPeerLine(
        `${priority}Retest on ${data.retest.nodeName}${data.retest.isDue ? " is due now" : data.retest.countdownLabel ? ` unlocks in ${data.retest.countdownLabel}` : " is scheduled"}. ${gridLine}`,
        data,
      ),
      nextAction: data.retest.isDue
        ? `Tap below — Quest loads ${data.retest.nodeName} retest immediately.`
        : `Practice ${data.retest.nodeName} until the retest unlocks, then return here.`,
      ctaHref: retestOrPracticeHref(data.retest.nodeName, data.retest.skillNodeId, data.retest.isDue),
      ctaLabel: data.retest.isDue
        ? `Start retest: ${data.retest.nodeName}`
        : `Queue practice: ${data.retest.nodeName}`,
    };
  }

  const creditSuffix = [packSprintLine, creditLine].filter(Boolean).join(" ");
  return {
    verdict: appendPeerLine(`${gridLine}${creditSuffix ? ` ${creditSuffix}` : ""}`, data),
    nextAction: data.credit.momentumActive
      ? "Book your included Guide session on the node that still will not move."
      : "Take a verified first attempt on an unverified node, or book a Guide when the wall is real.",
    ctaHref: data.credit.momentumActive ? bookGuideWithCreditHref(null) : "/student/mastery",
    ctaLabel: data.credit.momentumActive ? "Book with credit" : "View Mastery Grid",
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
    if (data.credit.monthlyCreditsRemaining > 0) {
      lines.push(`Credit: ${data.credit.monthlyCreditsRemaining} included session remaining`);
    } else {
      lines.push("Credit: included session used this month");
    }
  }
  if (data.packSprint && data.packSprint.creditsRemaining > 0) {
    lines.push(buildPackSprintReceiptLine(data.packSprint));
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
  if (data.slaGrant) {
    lines.push(buildLoopSlaReceiptLine({ nodeName: data.slaGrant.nodeName }));
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
  if (data.packSprint && data.packSprint.creditsRemaining > 0) {
    return `${hi} — sprint: ${data.packSprint.creditsRemaining} of ${data.packSprint.creditsGranted} sessions left`;
  }
  if (data.credit.monthlyCreditsRemaining > 0) {
    return `${hi} — your included session credit is unused`;
  }
  return `${hi} — your weekly Movement Receipt`;
}

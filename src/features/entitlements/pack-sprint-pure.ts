import { MOMENTUM_PACK_SESSION_COUNT } from "@/features/booking/booking-pricing";
import { quarterlyCreditExpiryMs } from "@/features/entitlements/alumni-momentum-pure";

export const PACK_SPRINT_EXPIRY_DAYS = 90;

export type PackSprintState = {
  creditsRemaining: number;
  creditsGranted: number;
  daysRemaining: number;
  expiresAt: string;
};

export type CreditConsumeCandidate = {
  kind: "pack" | "monthly" | "alumni";
  id: string;
  expiresAtMs: number;
  creditsRemaining: number;
};

/** ISO timestamp 90 days after grant. */
export function packSprintExpiryIso(grantedAt: Date = new Date()): string {
  const expires = new Date(grantedAt.getTime());
  expires.setUTCDate(expires.getUTCDate() + PACK_SPRINT_EXPIRY_DAYS);
  return expires.toISOString();
}

/** Last instant of the UTC calendar month for a period_month row. */
export function monthlyCreditExpiryMs(periodMonth: string): number {
  const start = new Date(`${periodMonth}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  return Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999);
}

export function daysRemainingUntil(expiresAtIso: string, nowMs = Date.now()): number {
  const expiresMs = new Date(expiresAtIso).getTime();
  if (!Number.isFinite(expiresMs)) return 0;
  return Math.max(0, Math.ceil((expiresMs - nowMs) / (24 * 60 * 60 * 1000)));
}

export function buildPackSprintReceiptLine(state: Pick<PackSprintState, "creditsRemaining" | "creditsGranted" | "daysRemaining">): string {
  return `Sprint: ${state.creditsRemaining} of ${state.creditsGranted} remaining, ${state.daysRemaining} ${state.daysRemaining === 1 ? "day" : "days"} left`;
}

/** Pick the credit pool that expires soonest (oldest expiring first). */
export function selectCreditConsumeCandidate(
  input: {
    pack: { id: string; creditsRemaining: number; expiresAt: string } | null;
    monthly: { id: string; creditsRemaining: number; periodMonth: string } | null;
    alumni: { id: string; creditsRemaining: number; periodMonth: string } | null;
    nowMs?: number;
  },
): CreditConsumeCandidate | null {
  const candidates: CreditConsumeCandidate[] = [];
  const nowMs = input.nowMs ?? Date.now();

  if (input.pack && input.pack.creditsRemaining > 0) {
    const expiresMs = new Date(input.pack.expiresAt).getTime();
    if (Number.isFinite(expiresMs) && expiresMs > nowMs) {
      candidates.push({
        kind: "pack",
        id: input.pack.id,
        expiresAtMs: expiresMs,
        creditsRemaining: input.pack.creditsRemaining,
      });
    }
  }

  if (input.monthly && input.monthly.creditsRemaining > 0) {
    candidates.push({
      kind: "monthly",
      id: input.monthly.id,
      expiresAtMs: monthlyCreditExpiryMs(input.monthly.periodMonth),
      creditsRemaining: input.monthly.creditsRemaining,
    });
  }

  if (input.alumni && input.alumni.creditsRemaining > 0) {
    candidates.push({
      kind: "alumni",
      id: input.alumni.id,
      expiresAtMs: quarterlyCreditExpiryMs(input.alumni.periodMonth),
      creditsRemaining: input.alumni.creditsRemaining,
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.expiresAtMs - b.expiresAtMs);
  return candidates[0] ?? null;
}

export function buildPackSprintState(input: {
  creditsRemaining: number;
  creditsGranted: number;
  expiresAt: string;
  nowMs?: number;
}): PackSprintState | null {
  if (input.creditsRemaining <= 0) return null;
  const daysRemaining = daysRemainingUntil(input.expiresAt, input.nowMs);
  if (daysRemaining <= 0) return null;
  return {
    creditsRemaining: input.creditsRemaining,
    creditsGranted: input.creditsGranted,
    daysRemaining,
    expiresAt: input.expiresAt,
  };
}

export function buildPackSprintSuccessMessages(input: {
  packSprint: PackSprintState | null;
  daysUntilExam: number | null;
}): { title: string; verdict: string; nextAction: string } {
  if (input.packSprint) {
    const sprintLine = buildPackSprintReceiptLine(input.packSprint);
    const examHint =
      input.daysUntilExam != null && input.daysUntilExam > 0 && input.daysUntilExam <= 120
        ? ` Your target date is ${input.daysUntilExam} days out.`
        : "";
    return {
      title: "Quarter Sprint Pack unlocked",
      verdict: `${sprintLine}.${examHint}`,
      nextAction: `Book your first sprint session on the wall node before the ${MOMENTUM_PACK_SESSION_COUNT} credits expire.`,
    };
  }

  return {
    title: "Quarter Sprint Pack purchased",
    verdict: "Your sprint credits are being added. Refresh once if they do not appear yet.",
    nextAction: "Open Browse Guides and book when sprint credits show as available.",
  };
}

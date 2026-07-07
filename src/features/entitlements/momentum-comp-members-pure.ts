import type { StudentSubscriptionRow } from "@/features/payments/student-subscription";
import { isMomentumSubscriptionActive } from "@/features/payments/student-subscription";

/** Exact emails with full Momentum comp (no Stripe subscription required). */
const MOMENTUM_COMP_EMAILS = new Set<string>([
  // trapdimej@… — add full email here when known
]);

/** Local-part handles that receive full Momentum comp. */
const MOMENTUM_COMP_HANDLES = new Set<string>(["trapdime", "trapdimej"]);

export type MomentumCompIdentity = {
  email?: string | null;
  displayName?: string | null;
};

function normalizeHandle(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isMomentumCompMember(identity: MomentumCompIdentity): boolean {
  const email = (identity.email ?? "").trim().toLowerCase();
  if (email && MOMENTUM_COMP_EMAILS.has(email)) {
    return true;
  }

  const local = email.split("@")[0] ?? "";
  const localNorm = normalizeHandle(local);
  if (localNorm && MOMENTUM_COMP_HANDLES.has(localNorm)) {
    return true;
  }

  const displayNorm = normalizeHandle(identity.displayName ?? "");
  if (displayNorm && MOMENTUM_COMP_HANDLES.has(displayNorm)) {
    return true;
  }

  return false;
}

export function resolveMomentumActive(input: {
  subscription: StudentSubscriptionRow | null;
  compMember?: boolean;
}): boolean {
  if (input.compMember) return true;
  return isMomentumSubscriptionActive(input.subscription);
}

export function momentumCompRenewalLabel(compMember: boolean): string | null {
  return compMember ? "Comp membership active." : null;
}

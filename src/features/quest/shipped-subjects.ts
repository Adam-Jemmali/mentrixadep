import { AP_CALC_AB_DIVISION_KEY } from "@/features/divisions/ap-calc-ab-division";
import { AP_CALC_AB_SUBJECT, isApCalculusAbSubject } from "@/features/quest/ap-calc-ab-subject";

export type ShippedSubject = {
  key: string;
  name: string;
  divisionKey: string;
};

/**
 * Subjects that pass the Mentrixa bar: skill tree, item bank, first-attempt volume.
 * Add the next subject here only after it clears the same gate as AP Calculus AB.
 */
export const SHIPPED_SUBJECT_CATALOG: readonly ShippedSubject[] = [
  {
    key: "ap-calculus-ab",
    name: AP_CALC_AB_SUBJECT,
    divisionKey: AP_CALC_AB_DIVISION_KEY,
  },
] as const;

export function shippedSubjectCount(): number {
  return SHIPPED_SUBJECT_CATALOG.length;
}

export function isSingleShippedSubject(): boolean {
  return shippedSubjectCount() === 1;
}

export function defaultShippedSubject(): ShippedSubject {
  return SHIPPED_SUBJECT_CATALOG[0]!;
}

export function defaultShippedSubjectName(): string {
  return defaultShippedSubject().name;
}

export function isShippedSubject(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return SHIPPED_SUBJECT_CATALOG.some(
    (subject) => subject.name.trim().toLowerCase() === normalized || isApCalculusAbSubject(name),
  );
}

export function filterToShippedSubjects(names: string[]): string[] {
  const shipped = new Set(SHIPPED_SUBJECT_CATALOG.map((s) => s.name.trim().toLowerCase()));
  return names.filter((name) => shipped.has(name.trim().toLowerCase()));
}

export function findShippedSubject(name: string): ShippedSubject | null {
  const normalized = name.trim().toLowerCase();
  return (
    SHIPPED_SUBJECT_CATALOG.find((subject) => subject.name.trim().toLowerCase() === normalized) ??
    null
  );
}

export function assertShippedSubjectName(
  name: string,
): { ok: true; name: string } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Subject is required." };
  }
  if (!isShippedSubject(trimmed)) {
    return {
      ok: false,
      error: `${defaultShippedSubjectName()} is the only subject available right now.`,
    };
  }
  const match = findShippedSubject(trimmed);
  return { ok: true, name: match?.name ?? trimmed };
}

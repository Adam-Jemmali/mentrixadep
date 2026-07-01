import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";

/** Canonical league / duel division for the single shipped skill tree. */
export const AP_CALC_AB_DIVISION_KEY = "ap-calculus-ab";

export const AP_CALC_AB_DIVISION_NAME = AP_CALC_AB_SUBJECT;

export const AP_CALC_AB_DIVISION_DESCRIPTION =
  "Limits, derivatives, integrals, and verified first attempts on the AP Calculus AB skill tree.";

/** Legacy hub key kept only until migration 132 remaps XP and focus. */
const LEGACY_ARENA_KEYS = new Set(["mathematics"]);

export function isApCalcAbDivisionKey(key: string): boolean {
  return key.trim().toLowerCase() === AP_CALC_AB_DIVISION_KEY;
}

export function isApCalcAbDivisionName(name: string): boolean {
  const normalized = name.replace(/\s+Division$/i, "").trim();
  return normalized === AP_CALC_AB_DIVISION_NAME;
}

export function isAllowedArenaDivisionKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  return isApCalcAbDivisionKey(k) || LEGACY_ARENA_KEYS.has(k);
}

export function filterArenaDivisions<
  T extends { key: string; name: string; description?: string | null },
>(items: T[]): T[] {
  const direct = items.filter(
    (d) => isApCalcAbDivisionKey(d.key) || isApCalcAbDivisionName(d.name),
  );
  if (direct.length > 0) return direct;

  const legacyMath = items.find((d) => d.key === "mathematics");
  if (legacyMath) {
    return [
      {
        ...legacyMath,
        name: AP_CALC_AB_DIVISION_NAME,
        description: AP_CALC_AB_DIVISION_DESCRIPTION,
      },
    ];
  }

  return [];
}

export function assertAllowedArenaDivisionKey(
  key: string,
): { ok: true; key: string } | { ok: false; error: string } {
  const trimmed = key.trim();
  if (!trimmed) {
    return { ok: false, error: "Division is required." };
  }
  if (!isAllowedArenaDivisionKey(trimmed)) {
    return {
      ok: false,
      error: `${AP_CALC_AB_DIVISION_NAME} is the only arena and duel division right now.`,
    };
  }
  return { ok: true, key: trimmed };
}

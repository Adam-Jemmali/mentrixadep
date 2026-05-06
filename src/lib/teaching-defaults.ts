/** Matches Teaching Defaults → Default duration on the tutor profile form. */
export const TEACHING_DEFAULT_DURATION_OPTIONS_MINUTES = [15, 30, 45, 60, 90, 120] as const;

export function normalizeTeachingDefaultDurationMinutes(raw: unknown): number {
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? Math.round(raw)
      : typeof raw === "string" && raw.trim() !== ""
        ? Math.round(Number(raw))
        : NaN;
  if (!Number.isFinite(n)) return 60;
  const allowed = TEACHING_DEFAULT_DURATION_OPTIONS_MINUTES as readonly number[];
  return allowed.includes(n) ? n : 60;
}

/** Add minutes to HH:mm on the same calendar day; null if the end would reach or pass midnight. */
export function addMinutesToHHmm(startHHmm: string, durationMinutes: number): string | null {
  const [h = NaN, m = NaN] = startHHmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(durationMinutes)) return null;
  const startTotal = h * 60 + m;
  const endTotal = startTotal + durationMinutes;
  if (endTotal >= 24 * 60) return null;
  const eh = Math.floor(endTotal / 60);
  const em = endTotal % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

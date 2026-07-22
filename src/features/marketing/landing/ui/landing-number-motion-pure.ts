/** Shared class hooks + copy helpers for landing numeric reveals. */

export const LP_NUM = {
  card: "lp-num-card",
  title: "lp-num-title",
  watermark: "lp-num-watermark",
  value: "lp-num-value",
  inline: "lp-num-inline",
} as const;

export const HUB_FRAC = {
  root: "hub-frac-root",
  stack: "hub-frac-stack",
  bar: "hub-frac-bar",
  tail: "hub-frac-tail",
  digit: "hub-frac-digit",
} as const;

export const LP_NUM_TITLE_CLASS =
  "lp-num-title inline-block font-[family-name:var(--font-playfair),serif] text-[clamp(2.5rem,6vw,3.25rem)] font-bold tabular-nums text-[#7C3AED] opacity-0";

export const LP_NUM_WATERMARK_CLASS =
  "lp-num-watermark pointer-events-none absolute -left-1 -top-2 select-none font-[family-name:var(--font-playfair),serif] text-[clamp(3rem,8vw,4.5rem)] font-bold leading-none tabular-nums text-[#6366F1]/25 opacity-0";

export const LP_NUM_INLINE_CLASS = "mr-1.5 tabular-nums text-[#6366F1]";

export const LP_NUM_STAT_VALUE_CLASS =
  "lp-num-value lp-sticky-word mt-3 font-[family-name:var(--font-playfair),serif] text-[clamp(1.75rem,4vw,2.25rem)] font-bold tabular-nums text-[#0B1220] opacity-0";

export function stepNumberLabel(index: number): string {
  return String(index + 1);
}

export function normalizeStepNumber(value: string | number): string {
  const raw = String(value).trim();
  if (!raw) return raw;
  const stripped = raw.replace(/^0+/, "");
  return stripped || raw;
}

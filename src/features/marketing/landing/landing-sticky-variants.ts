/** Landing-only sticky note silhouettes — curl matches student hub default. */
export type LandingStickyVariant = "curl" | "dog-ear" | "pinned" | "taped" | "clip" | "strip";

export const LANDING_STICKY_VARIANT_CYCLE: readonly LandingStickyVariant[] = [
  "curl",
  "pinned",
  "taped",
  "dog-ear",
  "clip",
  "strip",
] as const;

export function landingStickyVariantForIndex(index: number): LandingStickyVariant {
  return LANDING_STICKY_VARIANT_CYCLE[index % LANDING_STICKY_VARIANT_CYCLE.length]!;
}

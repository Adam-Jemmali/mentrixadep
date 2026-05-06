/**
 * UI performance tiers for low-end laptops / reduced-motion preferences.
 * "lite" disables continuous hover tracking, heavy layout animations, and fly-by XP paths.
 */

export type UiPerfTier = "full" | "lite";

export function readUiPerfTier(): UiPerfTier {
  if (typeof window === "undefined") return "full";
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return "lite";
    }
    const hc = navigator.hardwareConcurrency;
    if (typeof hc === "number" && hc > 0 && hc <= 4) {
      return "lite";
    }
    const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof dm === "number" && dm > 0 && dm <= 4) {
      return "lite";
    }
  } catch {
    /* ignore */
  }
  return "full";
}

export function syncUiPerfDataset(): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.mentrixaPerf = readUiPerfTier();
}

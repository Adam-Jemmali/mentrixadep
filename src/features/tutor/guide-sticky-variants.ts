import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
import {
  landingStickyVariantForIndex,
  LANDING_STICKY_VARIANT_CYCLE,
} from "@/features/marketing/landing/landing-sticky-variants";

export type { LandingStickyVariant as GuideStickyVariant };
export { landingStickyVariantForIndex, LANDING_STICKY_VARIANT_CYCLE };

export type GuideHubSection =
  | "home"
  | "studio"
  | "availability"
  | "payouts"
  | "impact"
  | "schedule";

/** Primary sticky silhouette per Guide hub section. */
export const GUIDE_SECTION_STICKY_VARIANT: Record<GuideHubSection, LandingStickyVariant> = {
  home: "pinned",
  studio: "clip",
  availability: "taped",
  payouts: "strip",
  impact: "dog-ear",
  schedule: "curl",
};

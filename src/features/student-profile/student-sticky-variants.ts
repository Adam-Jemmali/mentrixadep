import type { LandingStickyVariant } from "@/features/marketing/landing/landing-sticky-variants";
import {
  landingStickyVariantForIndex,
  LANDING_STICKY_VARIANT_CYCLE,
} from "@/features/marketing/landing/landing-sticky-variants";

export type { LandingStickyVariant as StudentStickyVariant };
export { landingStickyVariantForIndex, LANDING_STICKY_VARIANT_CYCLE };

export type StudentHubRoute = "home" | "skills" | "quest" | "league" | "duels";

/** Primary header silhouette per main student hub route. */
export const STUDENT_ROUTE_HEADER_VARIANT: Record<StudentHubRoute, LandingStickyVariant> = {
  home: "pinned",
  skills: "taped",
  quest: "clip",
  league: "dog-ear",
  duels: "strip",
};

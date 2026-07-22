import type Stripe from "stripe";
import { formatDate, formatTime } from "@/shared/core/time-format";

/** Minutes between availability start and end (minimum 1). */
export function getSessionDurationMinutes(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

/** Human-readable duration for Stripe line item + UI. */
export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) {
    return h === 1 ? "1 hr" : `${h} hr`;
  }
  return `${h} hr ${m} min`;
}

export function buildCheckoutLineItemCopy(params: {
  course: string;
  start_time: string;
  end_time: string;
}): { name: string; description: string } {
  const durationMin = getSessionDurationMinutes(params.start_time, params.end_time);
  const durationLabel = formatDurationLabel(durationMin);
  const dateStr = formatDate(params.start_time);
  const startT = formatTime(params.start_time);
  const endT = formatTime(params.end_time);

  return {
    name: `Mentrixa. ${params.course} tutoring`,
    description: `${dateStr}. ${startT} – ${endT}. ${durationLabel} session`,
  };
}

/** Hosted Checkout styling aligned with Mentrixa landing (Geist-like sans via Inter, blue CTA, soft cool shell). */
export function mentrixaCheckoutBranding() {
  return {
    display_name: "Mentrixa",
    // Matches Tailwind `surface.soft` / landing light sections
    background_color: "#F8FAFF",
    button_color: "#2563EB",
    border_style: "rounded" as const,
    // Closest to on-site Geist among Stripe’s hosted fonts
    font_family: "inter" as const,
  };
}

const CHECKOUT_LOGO_PATH = "/mentrixa-checkout-logo.svg";
const CHECKOUT_ICON_PATH = "/mentrixa-checkout-icon.svg";

/**
 * Stripe loads logo/icon from public HTTPS URLs. When `NEXT_PUBLIC_APP_URL` is `https://…`, we default
 * to assets in `/public`. Override with `STRIPE_CHECKOUT_LOGO_URL` / `STRIPE_CHECKOUT_ICON_URL` (e.g. CDN).
 */
export function mentrixaCheckoutBrandingWithAssets(
  appBaseUrl: string,
): Stripe.Checkout.SessionCreateParams.BrandingSettings {
  const base = mentrixaCheckoutBranding();
  const origin = appBaseUrl.replace(/\/$/, "");
  const explicitLogo = process.env.STRIPE_CHECKOUT_LOGO_URL?.trim();
  const explicitIcon = process.env.STRIPE_CHECKOUT_ICON_URL?.trim();
  const httpsOrigin = origin.startsWith("https://");
  const logoUrl = explicitLogo ?? (httpsOrigin ? `${origin}${CHECKOUT_LOGO_PATH}` : undefined);
  const iconUrl = explicitIcon ?? (httpsOrigin ? `${origin}${CHECKOUT_ICON_PATH}` : undefined);
  const out: Stripe.Checkout.SessionCreateParams.BrandingSettings = { ...base };
  if (logoUrl) out.logo = { type: "url", url: logoUrl };
  if (iconUrl) out.icon = { type: "url", url: iconUrl };
  return out;
}

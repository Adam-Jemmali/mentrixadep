import type { Page } from "@playwright/test";
import { isProductionMentrixaHost } from "../../src/shared/core/e2e-synthetic-account-pure";

/** Monday=0 … Sunday=6 in `timezone` (IANA), for matching CreateAvailabilityCard weekday buttons. */
export function monday0TomorrowInTimeZone(timeZone: string): number {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).formatToParts(tomorrow);
  const w = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[w] ?? 0;
}

export function weekdayButtonLabel(mon0: number): string {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][mon0] ?? "Mon";
}

/** Pick a future same-day window to reduce duplicate-slot collisions across reruns. */
export function pickSlotTimes(): { start: string; end: string } {
  const base = 10 + (Math.floor(Date.now() / 1000) % 6); // 10–15
  const startH = base;
  const endH = base + 1;
  return {
    start: `${String(startH).padStart(2, "0")}:00`,
    end: `${String(endH).padStart(2, "0")}:00`,
  };
}

export async function signOutFromAppShell(page: Page): Promise<void> {
  await page.getByRole("button", { name: /open profile menu/i }).click();
  await page.getByRole("button", { name: /^sign out$/i }).click();
  await page.waitForURL(/\/auth\/signin/, { timeout: 60_000 });
}

/**
 * Complete Stripe-hosted Checkout (card) in test mode.
 * Stripe’s DOM changes; this tries several common patterns.
 */
export async function completeStripeTestCardCheckout(page: Page): Promise<void> {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 120_000 });

  const card = "4242424242424242";
  const exp = "1234";
  const cvc = "123";
  const zip = "12345";

  const tryFill = async (locator: ReturnType<Page["locator"]>, value: string) => {
    if (await locator.isVisible().catch(() => false)) {
      await locator.fill(value);
      return true;
    }
    return false;
  };

  // Payment Element / combined fields (often in iframes)
  const frames = page.locator('iframe[src*="stripe"], iframe[name*="stripe"]');
  const n = await frames.count();
  for (let i = 0; i < n; i++) {
    const frame = page.frameLocator(`iframe >> nth=${i}`);
    await tryFill(frame.locator('input[name="cardnumber"], input[name="cardNumber"]'), card);
    await tryFill(frame.locator('input[name="exp-date"], input[placeholder*="MM"]'), exp);
    await tryFill(frame.locator('input[name="cvc"], input[placeholder*="CVC"]'), cvc);
    await tryFill(frame.locator('input[name="postal"], input[name="zip"]'), zip);
  }

  // Top-level hosted Checkout (legacy layout)
  await tryFill(page.locator('input[name="cardnumber"], input[name="cardNumber"]'), card);
  await tryFill(page.locator('input[name="cardExpiry"], input[name="exp-date"]'), exp);
  await tryFill(page.locator('input[name="cardCvc"], input[name="cvc"]'), cvc);
  await tryFill(page.locator('input[name="billingPostalCode"], input[name="postal"]'), zip);

  const pay = page.getByRole("button", { name: /^(pay|subscribe|complete order)/i });
  await pay.first().click({ timeout: 60_000 });

  await page.waitForURL((url) => !url.hostname.endsWith("stripe.com"), { timeout: 180_000 });
}

export function isBookingVideoE2EConfigured(): boolean {
  if (
    isProductionMentrixaHost(process.env.PLAYWRIGHT_BASE_URL) ||
    isProductionMentrixaHost(process.env.NEXT_PUBLIC_APP_URL)
  ) {
    return false;
  }
  const sk = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  return Boolean(
    process.env.E2E_TUTOR_EMAIL?.trim() &&
      process.env.E2E_TUTOR_PASSWORD?.trim() &&
      process.env.E2E_STUDENT_EMAIL?.trim() &&
      process.env.E2E_STUDENT_PASSWORD?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      sk.startsWith("sk_test")
  );
}

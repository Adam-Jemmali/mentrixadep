import { test, expect } from "@playwright/test";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  completeStripeTestCardCheckout,
  isBookingVideoE2EConfigured,
  monday0TomorrowInTimeZone,
  pickSlotTimes,
  signOutFromAppShell,
  weekdayButtonLabel,
} from "./helpers/booking-flow";

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

test.describe("Full booking → Stripe → tutor approve → Join session", () => {
  test.skip(!isBookingVideoE2EConfigured(), "Configure E2E_TUTOR_*, E2E_STUDENT_*, Supabase, and sk_test Stripe keys.");

  test("tutor availability, student checkout, tutor accept, both see Join session", async ({ page }) => {
    const tutorEmail = process.env.E2E_TUTOR_EMAIL!.trim();
    const tutorPassword = process.env.E2E_TUTOR_PASSWORD!.trim();
    const studentEmail = process.env.E2E_STUDENT_EMAIL!.trim();
    const studentPassword = process.env.E2E_STUDENT_PASSWORD!.trim();
    const tz = process.env.E2E_TUTOR_TIMEZONE?.trim() || "America/Toronto";
    const courseFilter = process.env.E2E_BOOKING_COURSE?.trim();
    const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const mon0 = monday0TomorrowInTimeZone(tz);
    const dayLabel = weekdayButtonLabel(mon0);
    const { start: startTime, end: endTime } = pickSlotTimes();

    // --- Tutor: create availability (tomorrow weekday, rolling time window) ---
    await signInWithEmailPassword(page, tutorEmail, tutorPassword);
    await expect(page).toHaveURL(/\/tutor/, { timeout: 45_000 });

    await page.getByRole("button", { name: /add availability/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /create availability/i })).toBeVisible({
      timeout: 30_000,
    });

    const subjectBlock = dialog.locator("label").filter({ hasText: /^Select Subject$/ }).locator("..");
    await subjectBlock.getByRole("button").first().click();

    const subjectMenu = subjectBlock.locator("div.relative").locator("div.shadow-2xl");
    await expect(subjectMenu.getByRole("button").first()).toBeVisible({ timeout: 10_000 });
    if (courseFilter) {
      await subjectMenu.getByRole("button", { name: courseFilter, exact: true }).click();
    } else {
      await subjectMenu.getByRole("button").first().click();
    }

    await dialog.getByRole("button", { name: dayLabel, exact: true }).click();

    const selects = dialog.locator("select");
    await selects.nth(0).selectOption(startTime);
    await selects.nth(1).selectOption(endTime);

    await dialog.getByRole("button", { name: /preview & create/i }).click();
    await dialog.getByRole("button", { name: /confirm & create/i }).click();

    await page.waitForTimeout(2500);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    await signOutFromAppShell(page);

    // --- Student: Pay & book via Stripe test card ---
    await signInWithEmailPassword(page, studentEmail, studentPassword);
    await expect(page).toHaveURL(/\/student/, { timeout: 45_000 });

    await page.goto("/student#browse-guides");
    await page.locator("#browse-guides").waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});

    const slotPattern = courseFilter
      ? new RegExp(`${escapeRe(courseFilter)}.*·`, "i")
      : /\w+.*·/;
    const slotBtn = page.getByRole("button", { name: slotPattern }).first();
    await expect(slotBtn).toBeVisible({ timeout: 120_000 });
    await slotBtn.click();

    await expect(page.getByRole("heading", { name: /book a session/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: /pay & book/i }).click();

    await completeStripeTestCardCheckout(page);

    await page.waitForURL(/\/student\/booking\/confirmed|\/student\?booking=/, { timeout: 180_000 });
    await expect(page.getByText(/payment received|session request sent/i).first()).toBeVisible({
      timeout: 60_000,
    });

    await signOutFromAppShell(page);

    // --- Tutor: Accept (no-op if DB auto-approved the request) ---
    await signInWithEmailPassword(page, tutorEmail, tutorPassword);
    await expect(page).toHaveURL(/\/tutor/, { timeout: 45_000 });

    const acceptBtn = page.getByRole("button", { name: /^accept$/i });
    if (await acceptBtn.isVisible({ timeout: 20_000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForTimeout(4000);
    }

    await page.getByText("Week's Schedule", { exact: false }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: /join session/i }).first()).toBeVisible({
      timeout: 120_000,
    });

    await signOutFromAppShell(page);

    // --- Student: Weekly schedule tab shows Join session ---
    await signInWithEmailPassword(page, studentEmail, studentPassword);
    await page.goto("/student#sessions-history");
    await page.getByRole("tab", { name: /^week$/i }).click();
    await expect(page.getByRole("button", { name: /join session/i }).first()).toBeVisible({
      timeout: 120_000,
    });
  });
});

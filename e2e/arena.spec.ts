import { test, expect } from "@playwright/test";

test.setTimeout(120_000);

test.describe("Arena live board accessibility", () => {
  test("exposes polite aria-live region for feed announcements", async ({ page }) => {
    await page.goto("/arena", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page.getByRole("main")).toBeVisible({ timeout: 60_000 });

    const liveRegion = page.locator('[aria-live="polite"]').first();
    await expect(liveRegion).toBeAttached();
    await expect(liveRegion).toHaveAttribute("aria-atomic", "false");
  });

  test("arena page loads without crash", async ({ page }) => {
    const response = await page.goto("/arena", { waitUntil: "domcontentloaded", timeout: 90_000 });
    expect(response?.status() ?? 500).toBeLessThan(500);
    await expect(page.getByText(/something went wrong|next_not_found/i)).toHaveCount(0);
  });
});
